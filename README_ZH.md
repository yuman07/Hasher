# Hasher

**基于 Tauri 2 + Rust 构建的快速、轻量级文件哈希校验工具。**

[**English**](./README.md)

---

## 截图

| 浅色模式 | 深色模式 |
|:---:|:---:|
| ![浅色模式](screenshots/1.png) | ![深色模式](screenshots/3.png) |
| ![哈希结果](screenshots/2.png) | ![设置](screenshots/4.png) |

## 功能特性

### 哈希算法

- 支持 **MD5** / **SHA-1** / **SHA-256** / **SHA-512**
- 每个文件单次读取，同时计算所有选中的算法（无需重复读取）
- 每种算法在独立线程上并行计算
- 可在设置中自由开关任意算法组合
- 一键切换哈希值大小写显示

### 性能优化

- **内存映射 I/O** (mmap) — 零用户态缓冲，由操作系统管理页缓存
- **并行线程** — 每种算法一个独立线程，多核下最高约 4 倍加速
- **平台优化 I/O** — macOS/Linux 使用 `madvise(SEQUENTIAL)` 主动预取，Windows 使用 `FILE_FLAG_SEQUENTIAL_SCAN`
- **精简线程栈** — 每个哈希线程仅 256 KB（系统默认 512 KB–8 MB）
- **空文件快速路径** — 0 字节文件无需 mmap 和线程开销
- **极小体积** — 应用仅约 2.3 MB

### 用户界面

- **拖放或点击选择** — 文件可拖放到窗口任意位置，也可点击虚线区域打开文件选择器
- **批量处理** — 同时处理多个文件，每个文件有实时进度条
- **深色 / 浅色模式** — 自动检测系统偏好，手动切换带平滑过渡动画
- **中文 / 英文** — 自动检测系统语言，支持手动切换
- **文件类型图标** — 按类型着色：图片（绿色）、视频（粉色）、音频（紫色）、压缩包（橙色）、代码（青色）、文档（蓝色）、可执行文件（灰色）
- **复制含算法名** — 点击复制按钮得到 `SHA-256: abc123...` 格式
- **折叠 / 展开** — 支持单个卡片折叠和全局一键折叠/展开
- **重复检测** — 重复拖入同一文件会替换旧结果重新计算
- **文件夹过滤** — 自动跳过文件夹并弹出提示
- **macOS Dock 拖放** — 支持拖文件到 Dock 图标启动并计算（冷启动）

### 偏好持久化

所有用户偏好保存在 `localStorage`，重启后自动恢复：

| 键名 | 内容 | 默认值 |
|---|---|---|
| `hasher-settings` | 算法开关 | 全部开启 |
| `hasher-lang` | 语言 (en/zh) | 跟随系统 |
| `hasher-theme` | 主题 (light/dark) | 跟随系统 |
| `hasher-case` | 哈希大小写 (lower/upper) | 小写 |

## 安装

### macOS

1. 从 [Releases](https://github.com/yuman07/Hasher/releases) 下载 `Hasher.app.tar.gz`
2. 解压后将 `Hasher.app` 拖入「应用程序」文件夹
3. **首次启动**：由于应用未经 Apple 开发者证书签名，macOS 会弹出安全提示。解决方法：
   - **方法 A**：右键点击 `Hasher.app` → **打开** → 在弹窗中点击 **打开**
   - **方法 B**：在终端中执行：
     ```bash
     xattr -cr /Applications/Hasher.app
     ```

### Windows

1. 从 [Releases](https://github.com/yuman07/Hasher/releases) 下载 `Hasher.exe`
2. 双击即可运行，无需安装（需要 Windows 10+ 且已内置 WebView2）

## 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | [Tauri 2](https://tauri.app/) |
| 后端 | Rust (md-5, sha1, sha2, memmap2) |
| 前端 | 原生 JS + CSS（无框架） |
| 构建 | Vite 6 |

## 开发

### 前置条件

- [Rust](https://rustup.rs/) (1.77+)
- [Node.js](https://nodejs.org/) (20+)

### 运行

```bash
npm install
npx tauri dev
```

### 构建

```bash
npx tauri build
```

## 项目结构

```
Hasher/
  index.html              # 入口 HTML
  src/
    main.js               # 前端逻辑、国际化、拖放、UI
    styles.css            # 样式、深色/浅色主题、动画
  src-tauri/
    Cargo.toml            # Rust 依赖
    tauri.conf.json       # Tauri 配置
    Info.plist            # macOS 文件关联（Dock 拖放）
    capabilities/
      default.json        # Tauri 权限
    src/
      main.rs             # Rust 入口
      lib.rs              # 哈希计算、mmap、线程、命令
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

MIT
