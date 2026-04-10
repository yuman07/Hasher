use digest::Digest;
use md5::Md5;
use serde::Serialize;
use sha1::Sha1;
use sha2::{Sha256, Sha512};
use std::fs::{self, File};
use std::io::Read;
use tauri::{command, AppHandle, Emitter};

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

#[command]
fn compute_hashes(
    app: AppHandle,
    file_path: String,
    file_id: String,
    algorithms: Vec<String>,
) -> Result<Vec<HashResult>, String> {
    let mut file = File::open(&file_path).map_err(|e| format!("Failed to open file: {}", e))?;
    let file_size = file
        .metadata()
        .map_err(|e| format!("Failed to read metadata: {}", e))?
        .len();

    let mut md5_h = if algorithms.contains(&"md5".into()) {
        Some(Md5::new())
    } else {
        None
    };
    let mut sha1_h = if algorithms.contains(&"sha1".into()) {
        Some(Sha1::new())
    } else {
        None
    };
    let mut sha256_h = if algorithms.contains(&"sha256".into()) {
        Some(Sha256::new())
    } else {
        None
    };
    let mut sha512_h = if algorithms.contains(&"sha512".into()) {
        Some(Sha512::new())
    } else {
        None
    };

    let mut buffer = vec![0u8; 8 * 1024 * 1024]; // 8 MB buffer for fast I/O
    let mut processed: u64 = 0;
    let mut last_pct: i32 = -1;

    loop {
        let n = file.read(&mut buffer).map_err(|e| format!("Read error: {}", e))?;
        if n == 0 {
            break;
        }

        let chunk = &buffer[..n];
        if let Some(ref mut h) = md5_h {
            h.update(chunk);
        }
        if let Some(ref mut h) = sha1_h {
            h.update(chunk);
        }
        if let Some(ref mut h) = sha256_h {
            h.update(chunk);
        }
        if let Some(ref mut h) = sha512_h {
            h.update(chunk);
        }

        processed += n as u64;
        let pct = if file_size > 0 {
            (processed as f64 / file_size as f64 * 100.0) as i32
        } else {
            100
        };

        if pct > last_pct {
            last_pct = pct;
            let _ = app.emit(
                "hash-progress",
                HashProgress {
                    file_id: file_id.clone(),
                    progress: (processed as f64) / (file_size.max(1) as f64),
                },
            );
        }
    }

    let mut results = Vec::new();
    if let Some(h) = md5_h {
        results.push(HashResult {
            file_id: file_id.clone(),
            algorithm: "MD5".into(),
            hash: format!("{:x}", h.finalize()),
        });
    }
    if let Some(h) = sha1_h {
        results.push(HashResult {
            file_id: file_id.clone(),
            algorithm: "SHA-1".into(),
            hash: format!("{:x}", h.finalize()),
        });
    }
    if let Some(h) = sha256_h {
        results.push(HashResult {
            file_id: file_id.clone(),
            algorithm: "SHA-256".into(),
            hash: format!("{:x}", h.finalize()),
        });
    }
    if let Some(h) = sha512_h {
        results.push(HashResult {
            file_id: file_id.clone(),
            algorithm: "SHA-512".into(),
            hash: format!("{:x}", h.finalize()),
        });
    }

    Ok(results)
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
