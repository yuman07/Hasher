use digest::Digest;
use md5::Md5;
use memmap2::Mmap;
use serde::Serialize;
use sha1::Sha1;
use sha2::{Sha256, Sha512};
use std::fs::{self, File};
use std::sync::atomic::{AtomicU64, Ordering};
use std::sync::Arc;
use std::time::Duration;
use tauri::{command, AppHandle, Emitter};

/// Logical chunk size for progress granularity when iterating the mmap.
const CHUNK_SIZE: usize = 2 * 1024 * 1024;

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

/// Run a digest algorithm over `data` in chunks, atomically incrementing
/// `processed` after each chunk so the caller can report progress.
fn hash_chunk<D: Digest>(data: &[u8], processed: &AtomicU64) -> String {
    let mut hasher = D::new();
    for chunk in data.chunks(CHUNK_SIZE) {
        hasher.update(chunk);
        processed.fetch_add(chunk.len() as u64, Ordering::Relaxed);
    }
    let result = hasher.finalize();
    let mut hex = String::with_capacity(result.len() * 2);
    for &b in result.iter() {
        hex.push(HEX_LUT[(b >> 4) as usize] as char);
        hex.push(HEX_LUT[(b & 0x0f) as usize] as char);
    }
    hex
}

static HEX_LUT: &[u8; 16] = b"0123456789abcdef";

/// Compute hashes for an empty file without spawning threads or mmap.
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

#[command]
async fn compute_hashes(
    app: AppHandle,
    file_path: String,
    file_id: String,
    algorithms: Vec<String>,
) -> Result<Vec<HashResult>, String> {
    tokio::task::spawn_blocking(move || {
        let file =
            File::open(&file_path).map_err(|e| format!("Failed to open file: {}", e))?;
        let file_size = file
            .metadata()
            .map_err(|e| format!("Failed to read metadata: {}", e))?
            .len();

        if file_size == 0 {
            let _ = app.emit(
                "hash-progress",
                HashProgress { file_id: file_id.clone(), progress: 1.0 },
            );
            return Ok(hash_empty(&file_id, &algorithms));
        }

        // SAFETY: The file is opened read-only and we do not modify it while
        // mapped.  External modification is a theoretical UB risk accepted by
        // every mmap-based tool (sha256sum, etc.).
        let mmap = Arc::new(
            unsafe { Mmap::map(&file) }.map_err(|e| format!("mmap error: {}", e))?,
        );

        // Tell the kernel we will read sequentially: enables aggressive
        // prefetch and early page-out of already-read pages.
        #[cfg(unix)]
        mmap.advise(memmap2::Advice::Sequential).ok();

        // total_work = file_size * number_of_algorithms so that each
        // algorithm's byte-processing contributes equally to the bar.
        let num_algos = algorithms.len() as u64;
        let total_work = file_size.saturating_mul(num_algos);
        let processed = Arc::new(AtomicU64::new(0));

        // --- spawn one OS thread per algorithm (max 4) ---
        let mut handles: Vec<(&str, std::thread::JoinHandle<String>)> =
            Vec::with_capacity(algorithms.len());

        for algo in &algorithms {
            let m = Arc::clone(&mmap);
            let p = Arc::clone(&processed);
            let (name, handle) = match algo.as_str() {
                "md5" => (
                    "MD5",
                    std::thread::spawn(move || hash_chunk::<Md5>(&m, &p)),
                ),
                "sha1" => (
                    "SHA-1",
                    std::thread::spawn(move || hash_chunk::<Sha1>(&m, &p)),
                ),
                "sha256" => (
                    "SHA-256",
                    std::thread::spawn(move || hash_chunk::<Sha256>(&m, &p)),
                ),
                "sha512" => (
                    "SHA-512",
                    std::thread::spawn(move || hash_chunk::<Sha512>(&m, &p)),
                ),
                _ => continue,
            };
            handles.push((name, handle));
        }

        // --- progress reporter runs on *this* (blocking) thread ---
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

        // --- collect results in the original algorithm order ---
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
    let name = std::path::Path::new(&file_path)
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| file_path.clone());
    Ok(FileMetadata {
        size: meta.len(),
        name,
    })
}

pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![compute_hashes, get_file_metadata])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
