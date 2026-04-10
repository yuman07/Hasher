# Hasher

**基于 Tauri 2 + Rust 构建的快速跨平台文件哈希校验工具。**

[**English**](./README.md)

---

## 功能特性

### 哈希算法

- 支持 **MD5** / **SHA-1** / **SHA-256** / **SHA-512**
- 每个文件单次读取，同时计算所有选中的算法（无需重复读取）
- 每种算法在独立线程上并行计算
- 可在设置中自由开关任意算法组合
- 一键切换哈希值大小写显示

### 性能优化

- **内存映射 I/O** (mmap) - 零用户态缓冲，由操作系统管理页缓存
- **并行线程** - 每种算法一个独立线程，多核下最高约 4 倍加速
- **平台优化 I/O** - macOS/Linux 使用 `madvise(SEQUENTIAL)` 主动预取，Windows 使用 `FILE_FLAG_SEQUENTIAL_SCAN`
- **精简线程栈** - 每个哈希线程仅 256 KB（系统默认 512 KB-8 MB）
- **空文件快速路径** - 0 字节文件无需 mmap 和线程开销

### 用户界面

- **拖放操作** - 文件可拖放到窗口任意位置，也可拖到 macOS Dock 图标（未启动时也支持）
- **批量处理** - 同时处理多个文件，每个文件有实时进度条
- **深色 / 浅色模式** - 自动检测系统偏好，手动切换带平滑过渡动画
- **中文 / 英文** - 自动检测系统语言，支持手动切换
- **文件类型图标** - 按类型着色：图片（绿色）、视频（粉色）、音频（紫色）、压缩包（橙色）、代码（青色）、文档（蓝色）、可执行文件（灰色）
- **完整文件路径** - 显示在文件名下方，过长时省略号截断，悬停显示完整路径
- **复制含算法名** - 点击复制按钮得到 `SHA-256: abc123...` 格式
- **折叠 / 展开** - 支持单个卡片折叠和全局一键折叠/展开
- **自动编号** - 纯 CSS 计数器自动为卡片编号，增删后自动重排
- **重复检测** - 重复拖入同一文件会替换旧结果重新计算
- **文件夹过滤** - 自动跳过文件夹并弹出 toast 提示
- **macOS Dock 拖放** - 支持拖文件到 Dock 图标启动并计算（冷启动）

### 偏好持久化

所有用户偏好保存在 `localStorage`，重启后自动恢复：

| 键名 | 内容 | 默认值 |
|---|---|---|
| `hasher-settings` | 算法开关 | 全部开启 |
| `hasher-lang` | 语言 (en/zh) | 跟随系统 |
| `hasher-theme` | 主题 (light/dark) | 跟随系统 |
| `hasher-case` | 哈希大小写 (lower/upper) | 小写 |

## 技术栈

| 层级 | 技术 |
|---|---|
| 框架 | [Tauri 2](https://tauri.app/) |
| 后端 | Rust (md-5, sha1, sha2, memmap2) |
| 前端 | 原生 JS + CSS（无框架） |
| 构建 | Vite 6 |
| 包管理 | [Devbox](https://www.jetify.com/devbox) (Node.js) + Cargo (Rust) |

## 快速开始

### 前置条件

- [Rust](https://rustup.rs/) (1.77+)
- [Node.js](https://nodejs.org/) (20+)
- [Devbox](https://www.jetify.com/devbox)（可选，用于隔离环境）

### 开发

```bash
# 安装依赖
devbox run -- npm install

# 启动开发模式
devbox run -- npx tauri dev
```

### 构建

```bash
# 构建发布版本
devbox run -- npx tauri build --bundles app

# 产物路径：
# macOS: src-tauri/target/release/bundle/macos/Hasher.app
# Windows: src-tauri/target/release/bundle/msi/Hasher_*.msi
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
  devbox.json             # Devbox 配置
  package.json            # npm 配置
  vite.config.js          # Vite 配置
```

## 架构

```
  前端 (JS)                              后端 (Rust)
  ────────                               ──────────
  拖放文件           ──invoke──>         open_for_hashing()
                                           │
  监听进度事件       <──emit───          mmap 映射文件
  更新 UI                                  │
                                         每种算法一个线程：
                                           ├─ MD5    ─┐
                                           ├─ SHA-1  ─┤ AtomicU64
                                           ├─ SHA-256 ┤ 进度计数器
                                           └─ SHA-512 ┘
                                           │
  接收结果           <──return──         收集 hex 结果
```

## 许可证

MIT
