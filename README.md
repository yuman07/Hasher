# Hasher

**Fast, cross-platform file hash checker built with Tauri 2 + Rust.**

**基于 Tauri 2 + Rust 构建的快速跨平台文件哈希校验工具。**

---

## Features | 功能特性

### Hash Algorithms | 哈希算法

- **MD5** / **SHA-1** / **SHA-256** / **SHA-512**
- All algorithms computed in a single pass per file (no re-reading)
- Each algorithm runs on a dedicated thread for parallel computation
- Toggle any combination on/off in settings
- Uppercase / lowercase hash display with one-click toggle

---

- 支持 MD5 / SHA-1 / SHA-256 / SHA-512
- 每个文件单次读取，同时计算所有选中的算法
- 每种算法在独立线程上并行计算
- 可在设置中自由开关任意算法组合
- 一键切换哈希值大小写显示

### Performance | 性能优化

- **Memory-mapped I/O** (mmap) - zero userspace buffer, OS manages page cache
- **Parallel threads** - one OS thread per algorithm, up to ~4x speedup on multi-core
- **Platform-optimized I/O** - `madvise(SEQUENTIAL)` on macOS/Linux, `FILE_FLAG_SEQUENTIAL_SCAN` on Windows
- **Minimal thread stack** - 256 KB per hash thread (vs 512 KB-8 MB default)
- **Empty file fast path** - no mmap or thread overhead for 0-byte files

---

- **内存映射 I/O** (mmap) - 零用户态缓冲，由操作系统管理页缓存
- **并行线程** - 每种算法一个独立线程，多核下最高约 4 倍加速
- **平台优化 I/O** - macOS/Linux 使用 `madvise(SEQUENTIAL)`，Windows 使用 `FILE_FLAG_SEQUENTIAL_SCAN`
- **精简线程栈** - 每个哈希线程仅 256 KB（系统默认 512 KB-8 MB）
- **空文件快速路径** - 0 字节文件无需 mmap 和线程开销

### User Interface | 用户界面

- **Drag & drop** - drop files anywhere in the window, or onto the macOS Dock icon (even when not running)
- **Multiple files** - process many files at once with real-time progress bars
- **Dark / Light mode** - auto-detects system preference, manual toggle with smooth animated transition
- **Chinese / English** - auto-detects system locale, manual toggle
- **File type icons** - color-coded icons for images, videos, audio, archives, code, documents, executables
- **Full file path** - displayed below the file name, truncated with tooltip for long paths
- **Copy with algorithm name** - click copy button to get `SHA-256: abc123...` in clipboard
- **Collapse / expand** - per-card and global toggle for compact view
- **Auto-incrementing index** - numbered cards via CSS counters
- **Duplicate detection** - re-dropping the same file replaces the old result
- **Folder rejection** - folders are skipped with a toast notification
- **macOS Dock drop** - drop files on Dock icon to launch and compute (cold start supported)

---

- **拖放操作** - 文件可拖放到窗口任意位置，也可拖到 macOS Dock 图标（未启动时也支持）
- **批量处理** - 同时处理多个文件，每个文件有实时进度条
- **深色 / 浅色模式** - 自动检测系统偏好，手动切换带平滑过渡动画
- **中文 / 英文** - 自动检测系统语言，支持手动切换
- **文件类型图标** - 按类型着色：图片、视频、音频、压缩包、代码、文档、可执行文件
- **完整文件路径** - 显示在文件名下方，过长时省略并悬停显示完整路径
- **复制含算法名** - 点击复制按钮得到 `SHA-256: abc123...` 格式
- **折叠 / 展开** - 支持单个卡片和全局一键折叠
- **自动编号** - 纯 CSS 计数器自动为卡片编号
- **重复检测** - 重复拖入同一文件会替换旧结果重新计算
- **文件夹过滤** - 自动跳过文件夹并弹出 toast 提示
- **macOS Dock 拖放** - 支持拖文件到 Dock 图标启动并计算（冷启动）

### Preferences Persistence | 偏好持久化

All user preferences are saved to `localStorage` and restored on restart:

| Key | Content | Default |
|---|---|---|
| `hasher-settings` | Algorithm toggles | All enabled |
| `hasher-lang` | Language (en/zh) | System locale |
| `hasher-theme` | Theme (light/dark) | System preference |
| `hasher-case` | Hash case (lower/upper) | Lowercase |

---

所有用户偏好保存在 `localStorage`，重启后自动恢复：

| 键名 | 内容 | 默认值 |
|---|---|---|
| `hasher-settings` | 算法开关 | 全部开启 |
| `hasher-lang` | 语言 (en/zh) | 跟随系统 |
| `hasher-theme` | 主题 (light/dark) | 跟随系统 |
| `hasher-case` | 哈希大小写 (lower/upper) | 小写 |

## Tech Stack | 技术栈

| Layer | Technology |
|---|---|
| Framework | [Tauri 2](https://tauri.app/) |
| Backend | Rust (md-5, sha1, sha2, memmap2) |
| Frontend | Vanilla JS + CSS (no framework) |
| Build | Vite 6 |
| Package Manager | [Devbox](https://www.jetify.com/devbox) (Node.js) + Cargo (Rust) |

## Getting Started | 快速开始

### Prerequisites | 前置条件

- [Rust](https://rustup.rs/) (1.77+)
- [Node.js](https://nodejs.org/) (20+)
- [Devbox](https://www.jetify.com/devbox) (optional, for isolated environment | 可选，用于隔离环境)

### Development | 开发

```bash
# Install dependencies | 安装依赖
devbox run -- npm install

# Start dev mode | 启动开发模式
devbox run -- npx tauri dev
```

### Build | 构建

```bash
# Build release | 构建发布版本
devbox run -- npx tauri build --bundles app

# Output | 产物路径:
# macOS: src-tauri/target/release/bundle/macos/Hasher.app
# Windows: src-tauri/target/release/bundle/msi/Hasher_*.msi
```

## Project Structure | 项目结构

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
  devbox.json             # Devbox configuration
  package.json            # npm configuration
  vite.config.js          # Vite configuration
```

## Architecture | 架构

```
  Frontend (JS)                         Backend (Rust)
  ─────────────                         ──────────────
  Drag & drop file     ──invoke──>      open_for_hashing()
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

## License | 许可证

MIT
