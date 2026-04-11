# Hasher

**Fast, lightweight file hash checker built with Tauri 2 + Rust.**

[**中文文档**](./README_ZH.md)

---

## Screenshots

| Light Mode | Dark Mode |
|:---:|:---:|
| ![Light mode](screenshots/1.png) | ![Dark mode](screenshots/3.png) |
| ![Hash results](screenshots/2.png) | ![Settings](screenshots/4.png) |

## Features

### Hash Algorithms

- **MD5** / **SHA-1** / **SHA-256** / **SHA-512**
- All algorithms computed in a single pass per file (no re-reading)
- Each algorithm runs on a dedicated thread for parallel computation
- Toggle any combination on/off in settings
- Uppercase / lowercase hash display with one-click toggle

### Performance

- **Memory-mapped I/O** (mmap) — zero userspace buffer, OS manages page cache
- **Parallel threads** — one OS thread per algorithm, up to ~4x speedup on multi-core
- **Platform-optimized I/O** — `madvise(SEQUENTIAL)` on macOS/Linux, `FILE_FLAG_SEQUENTIAL_SCAN` on Windows
- **Minimal thread stack** — 256 KB per hash thread (vs 512 KB–8 MB default)
- **Empty file fast path** — no mmap or thread overhead for 0-byte files
- **Tiny binary** — ~2.3 MB app bundle

### User Interface

- **Drag & drop or click** — drop files anywhere in the window, or click the drop zone to open a file picker
- **Multiple files** — process many files at once with real-time progress bars
- **Dark / Light mode** — auto-detects system preference, manual toggle with smooth animated transition
- **Chinese / English** — auto-detects system locale, manual toggle
- **File type icons** — color-coded icons for images, videos, audio, archives, code, documents, executables
- **Copy with algorithm name** — click copy button to get `SHA-256: abc123...` in clipboard
- **Collapse / expand** — per-card and global toggle for compact view
- **Duplicate detection** — re-dropping the same file replaces the old result
- **Folder rejection** — folders are skipped with a toast notification
- **macOS Dock drop** — drop files on Dock icon to launch and compute (cold start supported)

### Preferences Persistence

All user preferences are saved to `localStorage` and restored on restart:

| Key | Content | Default |
|---|---|---|
| `hasher-settings` | Algorithm toggles | All enabled |
| `hasher-lang` | Language (en/zh) | System locale |
| `hasher-theme` | Theme (light/dark) | System preference |
| `hasher-case` | Hash case (lower/upper) | Lowercase |

## Installation

### macOS

1. Download `Hasher.app.tar.gz` from [Releases](https://github.com/yuman07/Hasher/releases)
2. Extract and drag `Hasher.app` to Applications
3. **First launch**: macOS will show a security warning because the app is not signed with an Apple Developer certificate. To open it:
   - **Option A**: Right-click `Hasher.app` → **Open** → click **Open** in the dialog
   - **Option B**: Run in Terminal:
     ```bash
     xattr -cr /Applications/Hasher.app
     ```

### Windows

1. Download `Hasher.exe` from [Releases](https://github.com/yuman07/Hasher/releases)
2. Run directly — no installation required (requires Windows 10+ with WebView2)

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | [Tauri 2](https://tauri.app/) |
| Backend | Rust (md-5, sha1, sha2, memmap2) |
| Frontend | Vanilla JS + CSS (no framework) |
| Build | Vite 6 |

## Development

### Prerequisites

- [Rust](https://rustup.rs/) (1.77+)
- [Node.js](https://nodejs.org/) (20+)

### Run

```bash
npm install
npx tauri dev
```

### Build

```bash
npx tauri build
```

## Project Structure

```
Hasher/
  index.html              # Entry HTML
  src/
    main.js               # Frontend logic, i18n, drag-drop, UI
    styles.css            # All styles, dark/light themes, animations
  src-tauri/
    Cargo.toml            # Rust dependencies
    tauri.conf.json       # Tauri configuration
    Info.plist            # macOS file association for Dock drop
    capabilities/
      default.json        # Tauri permissions
    src/
      main.rs             # Rust entry point
      lib.rs              # Hash computation, mmap, threading, commands
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

MIT
