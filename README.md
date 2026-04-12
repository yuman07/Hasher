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
  <img src="screenshots/1.png" width="49%" />
  <img src="screenshots/2.png" width="49%" />
</p>
<p align="center">
  <img src="screenshots/3.png" width="49%" />
  <img src="screenshots/4.png" width="49%" />
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

## Install

### macOS (Apple Silicon)

**Quick install (recommended):**

```bash
curl -fsSL https://raw.githubusercontent.com/yuman07/Hasher/main/install.sh | bash
```

The script automatically downloads the latest version, installs it to `/Applications`, and removes the quarantine flag so it opens without issues.

**Manual install:**

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

### Windows (x64)

Download [Hasher.exe](https://github.com/yuman07/Hasher/releases/latest) — portable, no install needed.

## Tech Stack

| | |
|:---|:---|
| **Framework** | [Tauri 2](https://tauri.app/) |
| **Backend** | Rust — md-5, sha1, sha2, memmap2 |
| **Frontend** | Vanilla JS + CSS (zero framework) |
| **Build** | Vite 8 |

## Development

### macOS (15.0 Sequoia+, Apple Silicon) — Recommended

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

# 5. Run or build
devbox run -- npx tauri dev       # dev mode
devbox run -- npx tauri build     # release build
```

### Windows (10+, x64) — AI-generated, not tested

```powershell
# 1. Install Visual Studio Build Tools (provides C/C++ compiler required by Rust and Tauri)
#    Download from https://visualstudio.microsoft.com/visual-cpp-build-tools/
#    Select "Desktop development with C++" workload during installation

# 2. Install Rust (rustup will auto-select the correct version via rust-toolchain.toml)
#    Download and run the installer from https://rustup.rs/

# 3. Install Node.js 24+
#    Download and run the installer from https://nodejs.org/

# 4. Clone the repository and enter the project directory
git clone https://github.com/yuman07/Hasher.git
cd Hasher

# 5. Install frontend dependencies
npm install

# 6. Run or build
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
