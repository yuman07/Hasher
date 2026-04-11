<h1 align="center">Hasher</h1>

<p align="center">
  <strong>基于 Tauri 2 + Rust 构建的快速、轻量级文件哈希校验工具</strong>
</p>

<p align="center">
  <a href="https://github.com/yuman07/Hasher/releases"><img src="https://img.shields.io/github/v/release/yuman07/Hasher?style=flat-square&color=blue" alt="Release" /></a>
  <a href="https://github.com/yuman07/Hasher/blob/main/LICENSE"><img src="https://img.shields.io/github/license/yuman07/Hasher?style=flat-square" alt="License" /></a>
  <a href="https://github.com/yuman07/Hasher/releases"><img src="https://img.shields.io/github/downloads/yuman07/Hasher/total?style=flat-square&color=green" alt="Downloads" /></a>
  <img src="https://img.shields.io/badge/platform-macOS%20%7C%20Windows-lightgrey?style=flat-square" alt="Platform" />
</p>

<p align="center">
  <a href="./README.md">English</a>
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

## 功能特性

- **哈希算法** — MD5 / SHA-1 / SHA-256 / SHA-512，可在设置中自由组合
- **拖放或点击选择** — 文件拖入窗口，或点击虚线区域打开文件选择器
- **批量处理** — 同时处理多个文件，每个文件有实时进度条
- **并行高性能** — 每种算法独立线程，内存映射 I/O，应用仅约 2.3 MB
- **深色 / 浅色模式** — 跟随系统偏好，切换带平滑过渡动画
- **中文 / 英文** — 自动检测系统语言
- **一键复制** — 点击即复制 `SHA-256: abc123...` 到剪贴板
- **文件类型图标** — 按类型着色区分
- **折叠 / 展开** — 支持单个卡片和全局折叠
- **macOS Dock 拖放** — 拖文件到 Dock 图标直接计算（支持冷启动）

## 安装

### macOS (Apple Silicon)

**一键安装：**

```bash
curl -fsSL https://github.com/yuman07/Hasher/releases/latest/download/Hasher_1.0.0_macos_aarch64.zip -o /tmp/Hasher.zip && unzip -oq /tmp/Hasher.zip -d /tmp/Hasher && cp -rf /tmp/Hasher/Hasher.app /Applications/ && xattr -cr /Applications/Hasher.app && rm -rf /tmp/Hasher /tmp/Hasher.zip && echo "✅ Hasher 已安装到 /Applications"
```

也可以从 [Releases](https://github.com/yuman07/Hasher/releases/latest) 手动下载，将 `Hasher.app` 拖入「应用程序」文件夹。

### Windows (x64)

下载 [Hasher.exe](https://github.com/yuman07/Hasher/releases/latest) — 免安装，双击即用。

## 技术栈

| | |
|:---|:---|
| **框架** | [Tauri 2](https://tauri.app/) |
| **后端** | Rust — md-5, sha1, sha2, memmap2 |
| **前端** | 原生 JS + CSS（零框架） |
| **构建** | Vite 6 |

## 开发

```bash
# 前置条件：Rust 1.77+、Node.js 20+

npm install
npx tauri dev       # 开发模式
npx tauri build     # 构建发布版
```

## 架构

```
  前端 (JS)                              后端 (Rust)
  ────────                               ──────────
  拖放 / 选择文件      ──invoke──>       open_for_hashing()
                                           │
  监听进度事件         <──emit───        mmap 映射文件
  更新 UI                                  │
                                         每种算法一个线程：
                                           ├─ MD5    ─┐
                                           ├─ SHA-1  ─┤ AtomicU64
                                           ├─ SHA-256 ┤ 进度计数器
                                           └─ SHA-512 ┘
                                           │
  接收结果             <──return──       收集 hex 结果
```

## 许可证

[MIT](LICENSE)
