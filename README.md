<p align="center"><img src="src-tauri/icons/128x128@2x.png" width="128" height="128"></p>

<h1 align="center">Hasher</h1>

<p align="center"><strong>Fast, lightweight file hash checker built with Tauri 2 + Rust</strong></p>

<p align="center">
  <a href="https://github.com/yuman07/Hasher/releases"><img src="https://img.shields.io/github/v/release/yuman07/Hasher?style=flat-square&color=blue" alt="Release" /></a>
  <a href="https://github.com/yuman07/Hasher/releases"><img src="https://img.shields.io/github/downloads/yuman07/Hasher/total?style=flat-square&color=green" alt="Downloads" /></a>
  <a href="https://github.com/yuman07/Hasher/stargazers"><img src="https://img.shields.io/github/stars/yuman07/Hasher?style=flat-square" alt="Stars" /></a>
  <br>
  <img src="https://img.shields.io/badge/macOS-15.0%2B%20Apple%20Silicon-000?style=flat-square&logo=apple" alt="macOS" />
  <img src="https://img.shields.io/badge/Windows-10%2B%20x64-0078D4?style=flat-square&logo=windows" alt="Windows" />
  <img src="https://img.shields.io/badge/Rust-stable-orange?style=flat-square&logo=rust" alt="Rust" />
  <a href="https://github.com/yuman07/Hasher/blob/main/LICENSE"><img src="https://img.shields.io/github/license/yuman07/Hasher?style=flat-square" alt="License" /></a>
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README_ZH.md">中文</a>
</p>

---

## What is Hasher?

Hasher is a desktop application that computes cryptographic file hashes instantly. Drop any file into the window and get MD5, SHA-1, SHA-256, and SHA-512 checksums — useful for verifying downloads, comparing files, or checking data integrity. Built with Tauri 2 and Rust for minimal resource usage (~2.3 MB binary).

## Features

- **Multiple algorithms** — MD5 / SHA-1 / SHA-256 / SHA-512, toggle any combination in settings
- **Drag & drop or click** — drop files into the window or click to open a file picker
- **Batch processing** — handle multiple files at once with real-time progress bars
- **Parallel & fast** — one thread per algorithm, memory-mapped I/O, ~2.3 MB binary
- **Dark / Light mode** — follows system preference with smooth animated toggle
- **Chinese / English** — auto-detects system locale
- **One-click copy** — copies `SHA-256: abc123...` to clipboard
- **File type icons** — color-coded by category
- **Collapse / expand** — per-card and global toggle
- **macOS Dock drop** — drop files on Dock icon to hash (cold start supported)

<p align="center">
  <img src="Screenshots/1.png" width="49%" />
  <img src="Screenshots/2.png" width="49%" />
</p>
<p align="center">
  <img src="Screenshots/3.png" width="49%" />
  <img src="Screenshots/4.png" width="49%" />
</p>

## Install

### macOS (15.0 Sequoia+, Apple Silicon)

#### Option 1 — Quick install (recommended)

```bash
curl -fsSL https://raw.githubusercontent.com/yuman07/Hasher/main/install.sh | bash
```

The script automatically downloads the latest version, installs it to `/Applications`, and removes the quarantine flag so it opens without issues.

#### Option 2 — Manual install

Download the `.dmg` from [Releases](https://github.com/yuman07/Hasher/releases/latest), open it, and drag `Hasher.app` to Applications.

> **Note:** This app is not signed with an Apple Developer certificate. macOS Gatekeeper will block it on first launch with a message like *"Hasher.app can't be opened because Apple cannot check it for malicious software"*. To fix this, choose **one** of the following methods after installing:
>
> **Method 1 — System Settings (easiest):**
> 1. Try to open Hasher — it will be blocked
> 2. Go to **System Settings > Privacy & Security**
> 3. Scroll down to the Security section, you'll see a message about Hasher being blocked
> 4. Click **"Open Anyway"**, then confirm in the dialog
>
> **Method 2 — Right-click:**
> 1. In Finder, right-click (or Control-click) on `Hasher.app`
> 2. Select **"Open"** from the context menu
> 3. Click **"Open"** in the dialog that appears
>
> **Method 3 — Terminal:**
> ```bash
> xattr -cr /Applications/Hasher.app
> ```
>
> You only need to do this once. After the first successful launch, macOS will remember your choice.

### Windows (10+, x64)

Download `Hasher_Win10_x64_<version>.exe` from [Releases](https://github.com/yuman07/Hasher/releases/latest) — portable, no install needed.

> **Note:** This app is not code-signed. Windows SmartScreen may show a warning saying *"Windows protected your PC"* on first launch. Click **"More info"** then **"Run anyway"** to proceed. This only happens once.

## Development

> Only macOS build steps are provided.

**Prerequisites:**

- macOS 15.6 Sequoia or later (Apple Silicon)
- Xcode Command Line Tools 26.0 or later

```bash
# 1. Install Xcode Command Line Tools (provides C/C++ compiler required by Rust and Tauri)
xcode-select --install

# 2. Install Devbox (manages Rust & Node.js automatically)
curl -fsSL https://get.jetify.com/devbox | bash

# 3. Clone the repository and enter the project directory
git clone https://github.com/yuman07/Hasher.git
cd Hasher

# 4. Install frontend dependencies
devbox run -- npm install

# 5. Run in dev mode or build for release
devbox run -- npx tauri dev       # dev mode
devbox run -- npx tauri build     # release build
```

## Technical Overview

| | |
|:---|:---|
| **Framework** | [Tauri 2](https://tauri.app/) |
| **Backend** | Rust — md-5, sha1, sha2, memmap2 |
| **Frontend** | Vanilla JS + CSS (zero framework) |
| **Build** | Vite 8 |
| **Runtime** | Node.js 24 |

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

```
Hasher/
├── src/                    # Frontend
│   ├── main.js             # App logic, i18n, UI rendering
│   └── styles.css          # Themes, layout, animations
├── src-tauri/
│   ├── src/
│   │   ├── main.rs         # Entry point
│   │   └── lib.rs          # Hashing engine, IPC commands
│   ├── icons/              # App icons (icns, ico, png)
│   ├── Info.plist          # macOS metadata
│   ├── Cargo.toml          # Rust dependencies
│   └── tauri.conf.json     # Tauri config (window, bundle)
├── index.html              # HTML shell with embedded SVG icons
├── vite.config.js          # Vite dev server config
├── package.json            # Frontend dependencies
├── devbox.json             # Devbox environment (Rust, Node.js)
├── build-meta.json         # Windows build naming metadata
├── install.sh              # macOS one-click install script
└── rust-toolchain.toml     # Rust stable channel pin
```

## License

[MIT](LICENSE)
