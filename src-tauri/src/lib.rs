use digest::Digest;
use md5::Md5;
use memmap2::Mmap;
use serde::Serialize;
use sha1::Sha1;
use sha2::{Sha256, Sha512};
use std::fs::{self, File};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::{Arc, Mutex};
use std::time::Duration;
use tauri::{command, AppHandle, Emitter, Manager, State};

/// Logical chunk size when iterating mmap — controls progress granularity.
const CHUNK_SIZE: usize = 2 * 1024 * 1024;

/// Hash threads need < 2 KB of stack; 256 KB is generous headroom while
/// saving ~1-31 MB vs the platform default (512 KB–8 MB) per thread.
const HASH_THREAD_STACK: usize = 256 * 1024;

static HEX_LUT: &[u8; 16] = b"0123456789abcdef";

#[derive(Clone, Serialize)]
struct HashProgress {
    file_id: String,
    progress: f64,
}

#[derive(Clone, Serialize)]
struct HashResult {
    file_id: String,
    algorithm: String,
    hash: String,
}

#[derive(Clone, Serialize)]
struct FileMetadata {
    size: u64,
    name: String,
}

// ── platform-optimised file open ──────────────────────────────────────

/// Open a file with the best sequential-read hints the OS provides.
///
/// * **Windows** – `FILE_FLAG_SEQUENTIAL_SCAN` tells the Cache Manager to
///   read-ahead aggressively and release pages early, cutting mmap page-fault
///   cost dramatically.
/// * **Unix** – plain `open()`; the sequential hint is applied later via
///   `madvise(MADV_SEQUENTIAL)` on the mapping itself.
fn open_for_hashing(path: &str) -> Result<File, String> {
    #[cfg(windows)]
    {
        use std::os::windows::fs::OpenOptionsExt;
        const FILE_FLAG_SEQUENTIAL_SCAN: u32 = 0x0800_0000;
        fs::OpenOptions::new()
            .read(true)
            .custom_flags(FILE_FLAG_SEQUENTIAL_SCAN)
            .open(path)
            .map_err(|e| format!("Failed to open file: {}", e))
    }

    #[cfg(not(windows))]
    {
        File::open(path).map_err(|e| format!("Failed to open file: {}", e))
    }
}

// ── core hash helpers ─────────────────────────────────────────────────

/// Stream a digest over `data` in chunks, bumping an atomic counter after
/// each so the UI can report progress.  Returns the hex-encoded hash.
fn hash_region<D: Digest>(data: &[u8], processed: &AtomicU64) -> String {
    let mut h = D::new();
    for chunk in data.chunks(CHUNK_SIZE) {
        h.update(chunk);
        processed.fetch_add(chunk.len() as u64, Ordering::Relaxed);
    }
    let digest = h.finalize();
    let mut hex = String::with_capacity(digest.len() * 2);
    for &b in digest.iter() {
        hex.push(HEX_LUT[(b >> 4) as usize] as char);
        hex.push(HEX_LUT[(b & 0x0f) as usize] as char);
    }
    hex
}

/// Spawn a hash thread with a small stack.
fn spawn_hasher<D: Digest + Send + 'static>(
    mmap: Arc<Mmap>,
    processed: Arc<AtomicU64>,
) -> Result<std::thread::JoinHandle<String>, String> {
    std::thread::Builder::new()
        .stack_size(HASH_THREAD_STACK)
        .spawn(move || hash_region::<D>(&mmap, &processed))
        .map_err(|e| format!("Thread creation failed: {}", e))
}

/// Handle 0-byte files without spawning threads or touching mmap.
fn hash_empty(file_id: &str, algorithms: &[String]) -> Vec<HashResult> {
    algorithms
        .iter()
        .filter_map(|algo| {
            let (name, hash) = match algo.as_str() {
                "md5" => ("MD5", format!("{:x}", Md5::digest(b""))),
                "sha1" => ("SHA-1", format!("{:x}", Sha1::digest(b""))),
                "sha256" => ("SHA-256", format!("{:x}", Sha256::digest(b""))),
                "sha512" => ("SHA-512", format!("{:x}", Sha512::digest(b""))),
                _ => return None,
            };
            Some(HashResult {
                file_id: file_id.into(),
                algorithm: name.into(),
                hash,
            })
        })
        .collect()
}

// ── Tauri commands ────────────────────────────────────────────────────

#[command]
async fn compute_hashes(
    app: AppHandle,
    file_path: String,
    file_id: String,
    algorithms: Vec<String>,
) -> Result<Vec<HashResult>, String> {
    tokio::task::spawn_blocking(move || {
        // ── open with platform-specific sequential-scan hint ──
        let file = open_for_hashing(&file_path)?;
        let file_size = file
            .metadata()
            .map_err(|e| format!("Failed to read metadata: {}", e))?
            .len();

        // ── fast path for empty files ──
        if file_size == 0 {
            let _ = app.emit(
                "hash-progress",
                HashProgress { file_id: file_id.clone(), progress: 1.0 },
            );
            return Ok(hash_empty(&file_id, &algorithms));
        }

        // ── memory-map: zero user-space buffer, OS manages page cache ──
        // SAFETY: file is opened read-only; external modification is the
        // standard mmap caveat accepted by every hashing tool.
        let mmap = Arc::new(
            unsafe { Mmap::map(&file) }.map_err(|e| format!("mmap error: {}", e))?,
        );

        // Unix: advise kernel to prefetch ahead and release behind.
        // (Windows equivalent is FILE_FLAG_SEQUENTIAL_SCAN, set at open.)
        #[cfg(unix)]
        mmap.advise(memmap2::Advice::Sequential).ok();

        // total_work = file_size × #algorithms — each algorithm's bytes
        // processed contributes equally to the progress bar.
        let num_algos = algorithms.len() as u64;
        let total_work = file_size.saturating_mul(num_algos);
        let processed = Arc::new(AtomicU64::new(0));

        // ── one OS thread per algorithm (max 4), each with a tiny stack ──
        let mut handles: Vec<(&str, std::thread::JoinHandle<String>)> =
            Vec::with_capacity(algorithms.len());

        for algo in &algorithms {
            let m = Arc::clone(&mmap);
            let p = Arc::clone(&processed);
            let (name, handle) = match algo.as_str() {
                "md5" => ("MD5", spawn_hasher::<Md5>(m, p)?),
                "sha1" => ("SHA-1", spawn_hasher::<Sha1>(m, p)?),
                "sha256" => ("SHA-256", spawn_hasher::<Sha256>(m, p)?),
                "sha512" => ("SHA-512", spawn_hasher::<Sha512>(m, p)?),
                _ => continue,
            };
            handles.push((name, handle));
        }

        // ── progress reporter runs on *this* blocking thread ──
        let emit_interval = Duration::from_millis(50);
        loop {
            std::thread::sleep(emit_interval);
            let cur = processed.load(Ordering::Relaxed);
            let _ = app.emit(
                "hash-progress",
                HashProgress {
                    file_id: file_id.clone(),
                    progress: (cur as f64 / total_work as f64).min(1.0),
                },
            );
            if handles.iter().all(|(_, h)| h.is_finished()) {
                break;
            }
        }

        let _ = app.emit(
            "hash-progress",
            HashProgress { file_id: file_id.clone(), progress: 1.0 },
        );

        // ── collect results in the original algorithm order ──
        let results = handles
            .into_iter()
            .map(|(name, h)| HashResult {
                file_id: file_id.clone(),
                algorithm: name.into(),
                hash: h.join().unwrap_or_default(),
            })
            .collect();

        Ok(results)
    })
    .await
    .map_err(|e| format!("Task error: {}", e))?
}

#[command]
fn get_file_metadata(file_path: String) -> Result<FileMetadata, String> {
    let meta = fs::metadata(&file_path).map_err(|e| e.to_string())?;
    if meta.is_dir() {
        return Err("Not a file".into());
    }
    let name = std::path::Path::new(&file_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| file_path.clone());
    Ok(FileMetadata {
        size: meta.len(),
        name,
    })
}

/// Files opened via macOS Dock drop before the frontend is ready.
struct PendingFiles(Mutex<Vec<String>>);

#[command]
fn take_pending_files(state: State<PendingFiles>) -> Vec<String> {
    state.0.lock().unwrap().drain(..).collect()
}

pub fn run() {
    let app = tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .manage(PendingFiles(Mutex::new(Vec::new())))
        .invoke_handler(tauri::generate_handler![
            compute_hashes,
            get_file_metadata,
            take_pending_files
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::Opened { urls } = event {
            let paths: Vec<String> = urls
                .iter()
                .filter_map(|u| u.to_file_path().ok())
                .map(|p| p.to_string_lossy().to_string())
                .collect();

            if paths.is_empty() {
                return;
            }

            // Try emitting to frontend (works if already loaded)
            let _ = app_handle.emit("open-files", &paths);

            // Also buffer for frontend init (cold launch from Dock drop)
            if let Some(state) = app_handle.try_state::<PendingFiles>() {
                state.0.lock().unwrap().extend(paths);
            }
        }
    });
}
