<p align="center">
  <img src="screenshots/1.png" width="600" />
</p>

<h1 align="center">Hasher</h1>

<p align="center">
  <strong>Fast, lightweight file hash checker built with Tauri 2 + Rust</strong>
</p>

<p align="center">
  <a href="https://github.com/yuman07/Hasher/releases"><img src="https://img.shields.io/github/v/release/yuman07/Hasher?style=flat-square&color=blue" alt="Release" /></a>
  <a href="https://github.com/yuman07/Hasher/blob/main/LICENSE"><img src="https://img.shields.io/github/license/yuman07/Hasher?style=flat-square" alt="License" /></a>
  <a href="https://github.com/yuman07/Hasher/releases"><img src="https://img.shields.io/github/downloads/yuman07/Hasher/total?style=flat-square&color=green" alt="Downloads" /></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey?style=flat-square" alt="Platform" />
</p>

<p align="center">
  <a href="./README_ZH.md">中文文档</a>
</p>

---

<p align="center">
  <img src="screenshots/2.png" width="49%" />
  <img src="screenshots/3.png" width="49%" />
</p>

<p align="center">
  <img src="screenshots/4.png" width="300" />
</p>

## Features

- **Algorithms** — MD5 / SHA-1 / SHA-256 / SHA-512, toggle any combination in settings
- **Drag & drop or click** — drop files into the window or click to open a file picker
- **Batch processing** — handle multiple files at once with real-time progress bars
- **Parallel & fast** — one thread per algorithm, memory-mapped I/O, ~2.3 MB binary
- **Dark / Light mode** — follows system preference, smooth animated toggle
- **Chinese / English** — auto-detects system locale
- **One-click copy** — copies `SHA-256: abc123...` to clipboard
- **File type icons** — color-coded by category
- **Collapse / expand** — per-card and global toggle
- **macOS Dock drop** — drop files on Dock icon to hash (cold start supported)

## Download

| Platform | File | Note |
|:---|:---|:---|
| **macOS** (Apple Silicon) | [Hasher.app.tar.gz](https://github.com/yuman07/Hasher/releases/latest) | Extract, drag to Applications |
| **Windows** (x64) | [Hasher.exe](https://github.com/yuman07/Hasher/releases/latest) | Portable, no install needed |

> **macOS first launch**: Right-click `Hasher.app` → **Open** → click **Open**, or run `xattr -cr /Applications/Hasher.app` in Terminal.

## Tech Stack

| | |
|:---|:---|
| **Framework** | [Tauri 2](https://tauri.app/) |
| **Backend** | Rust — md-5, sha1, sha2, memmap2 |
| **Frontend** | Vanilla JS + CSS (zero framework) |
| **Build** | Vite 6 |

## Development

```bash
# Prerequisites: Rust 1.77+, Node.js 20+

npm install
npx tauri dev       # dev mode
npx tauri build     # release build
```

## Architecture

```
  Frontend (JS)                         Backend (Rust)
  ─────────────                         ──────────────
  Drop / select file   ──invoke──>      open_for_hashing()
                                          │
  Listen progress      <──emit───       mmap file
  event & update UI                       │
                                        spawn thread per algo:
                                          ├─ MD5    ─┐
                                          ├─ SHA-1  ─┤ AtomicU64
                                          ├─ SHA-256 ┤ progress
                                          └─ SHA-512 ┘ counter
                                          │
  Receive results      <──return──      collect hex results
```

## License

[MIT](LICENSE)
