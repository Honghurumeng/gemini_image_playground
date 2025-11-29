# gemini_image_playground

这是一个基于 React 的现代化纯前端应用，专为与 Google 的 **Gemini 3 Pro** 模型交互而设计。它提供了一个流畅的聊天界面，支持多模态输入，并在等待 AI 思考时提供趣味性的互动体验。

## ✨ 主要特性

### 🎨 核心功能

- **纯前端架构**：基于 React 19 + Vite 6 构建，无需后端服务器，直接在浏览器中运行
- **Gemini 3 Pro 支持**：默认配置为 `gemini-3-pro-image-preview` 模型，支持最新的 AI 能力
- **多模态交互**：
  - 支持文本对话
  - 支持图片上传与分析（最多支持 14 张参考图片）
  - 支持在页面任意位置粘贴剪贴板图片，自动加入参考图列表
  - **✨ 拖拽上传**：支持将图片直接拖拽到输入框上传，无需点击按钮

### 🖼️ 图片功能 (新增)

- **📥 拖拽上传**：
  - 将图片拖拽到输入框区域即可上传
  - 拖拽时显示蓝色高亮边框提示
  - 支持同时拖拽多张图片

- **💾 一键下载**：
  - 生成的图片悬停显示下载按钮
  - 支持思维链中的图片下载
  - 自动命名：`gemini-image-{时间戳}.{扩展名}`

- **📚 图片历史记录**：
  - 自动收集所有生成的图片（最多保留 100 张）
  - 2x2 网格预览布局
  - 点击图片全屏查看 + 提示词详情
  - 支持单张下载或批量管理
  - 数据持久化保存到浏览器本地


### 🎮 等待街机模式

- **Waiting Arcade Mode**：
  - 在模型进行长思维链思考时，自动激活"街机模式"
  - **内置小游戏**：包含 **贪吃蛇 (Snake)**、**恐龙跑酷 (Dino)**、**2048** 和 **生命游戏 (Game of Life)**
  - **自适应体验**：游戏根据当前的**主题（明/暗）**和**设备类型（桌面/移动）**自动切换，打发等待时间

### 🧠 思维链可视化

- 通过可折叠的 UI 展示模型的思维过程（Thinking Process）
- 支持查看详细步骤
- 显示思考耗时

### 🎨 现代化 UI/UX

- **流畅交互**：实时流式响应，配合打字机效果
- **交互反馈**：集成 Toast 通知、全局对话框及操作音效
- **主题切换**：支持明亮（Light）、暗黑（Dark）及跟随系统主题
- **响应式设计**：完美适配桌面端和移动端

### 📝 Markdown 渲染

- 完美支持代码块高亮
- 支持表格、列表、引用等富文本格式
- 支持 GFM (GitHub Flavored Markdown)

### ⚙️ 高度可配置

- **API 设置**：支持自定义 API Endpoint 和模型名称
- **图像参数**：可调整生成图像的分辨率（1K/2K/4K）和长宽比
- **Grounding**：集成 Google Search Grounding 开关，支持联网搜索
- **安全隐私**：API Key 安全存储在本地浏览器中（LocalStorage），刷新页面不丢失，方便持续使用。随时可在设置中清除

## 🛠️ 技术栈

- **核心框架**: [React 19](https://react.dev/)
- **构建工具**: [Vite 6](https://vitejs.dev/)
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **样式方案**: [Tailwind CSS 4](https://tailwindcss.com/)
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)
- **AI SDK**: [Google GenAI SDK](https://www.npmjs.com/package/@google/genai)
- **图标库**: [Lucide React](https://lucide.dev/)
- **Markdown**: React Markdown + Remark GFM

## 🚀 快速开始

### 前置要求

- Node.js (建议 v18 或更高版本)
- Google Gemini API Key ([在此获取](https://aistudio.google.com/app/apikey))

## ⚙️ 使用说明

### 1. 配置 API Key

首次进入应用时，会弹窗提示输入 **Gemini API Key**。

> 注意：API Key 将安全存储在您的浏览器本地（LocalStorage），以便下次访问时自动加载。您可以在设置面板中随时将其清除。

### 2. URL 参数配置

支持通过 URL 参数快速预设配置，方便分享或特定场景使用：

- `apikey`: 预填 API Key
- `endpoint`: 自定义 API 端点 (Base URL)

**示例：**
```
http://localhost:3000/?endpoint=https://my-proxy.com&model=gemini-2.0-flash
```

### 3. 图片上传方式

支持两种图片上传方式：

#### 方式一：点击上传
- 点击输入框左侧的 📷 图标
- 选择图片文件（最多 14 张）

#### 方式二：拖拽上传 ✨ (新增)
- 直接将图片拖拽到输入框区域
- 看到蓝色高亮边框后松开鼠标
- 图片自动上传并显示预览

### 4. 图片历史记录 ✨ (新增)

点击顶部导航栏的 **🖼️ 图片图标**（带蓝色脉冲徽章）打开历史记录面板：

- **查看历史**：2x2 网格显示所有生成的图片
- **预览大图**：点击图片查看全屏预览 + 提示词详情
- **下载图片**：悬停显示下载按钮，或在预览模式下一键下载
- **清空历史**：点击顶部垃圾桶图标清空所有记录

### 5. 高级设置

点击右上角的设置图标（⚙️）打开设置面板，可以调整：

- **主题外观**：切换深色/浅色模式
- **图像生成设置**：调整分辨率和比例
- **Google Search Grounding**：开启后允许模型通过 Google 搜索获取实时信息
- **思维链开关**：显示/隐藏模型的思考过程
- **流式响应**：逐 token 流式传输或一次性响应
- **数据管理**：清除对话历史或重置 API Key

## 📂 项目结构

```
├── components/               # UI 组件
│   ├── games/                   # 街机模式小游戏 (Snake, Dino, 2048, Life)
│   ├── ui/                      # 通用 UI 组件 (Toast, Dialog)
│   ├── ApiKeyModal.tsx          # API Key 输入弹窗
│   ├── ChatInterface.tsx        # 主聊天区域
│   ├── InputArea.tsx            # 输入框与文件上传 (支持拖拽)
│   ├── MessageBubble.tsx        # 消息气泡与 Markdown 渲染 (支持下载)
│   ├── SettingsPanel.tsx        # 设置面板
│   ├── ImageHistoryPanel.tsx    # 图片历史记录面板 ✨
│   └── ThinkingIndicator.tsx    # 思维链指示器与游戏入口
├── services/                 # 服务层
│   └── geminiService.ts         # Google GenAI SDK 集成
├── store/                    # 状态管理
│   ├── useAppStore.ts           # 应用核心状态 (含图片历史)
│   └── useUiStore.ts            # UI 交互状态
├── utils/                    # 工具函数
│   ├── messageUtils.ts          # 消息处理工具
│   └── soundUtils.ts            # 音效处理工具
├── types.ts                  # TypeScript 类型定义
├── App.tsx                   # 根组件
├── index.tsx                 # 入口文件
└── CLAUDE.md                 # 项目开发文档 ✨
```

## 🎯 功能对比

| 功能 | 原版 | 当前版本 |
|------|------|----------|
| 图片上传 | ✅ 点击上传 | ✅ 点击 + 拖拽上传 |
| 图片下载 | ❌ 需右键另存为 | ✅ 悬停一键下载 |
| 图片历史 | ❌ 无 | ✅ 自动收集 + 预览 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📄 License

AGPL-3.0

## 🙏 致谢

- 原项目：[faithleysath/UndyDraw](https://github.com/faithleysath/UndyDraw)
