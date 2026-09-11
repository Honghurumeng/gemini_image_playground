# Nano Banana Pro 在线客户端

> 原仓库名 `gemini_image_playground` / 包名 `undydraw`

这是一个基于 **Preact** 的现代化纯前端应用，支持 **Gemini 3 Pro Image** 与 **OpenAI 兼容图片通道（gpt-image-2.5-flare / gpt-image-2.5-sunburst）** 双通道。它提供了一个流畅的聊天界面，支持多模态输入，并实时显示 AI 的思考状态（Gemini 通道）。页面标题为 `Nano Banana Pro 在线客户端`，100% 在浏览器中运行，无需后端。

## ✨ 主要特性

### 🎨 核心功能

- **纯前端架构**：基于 Preact 10 + Vite 7 构建，无需后端服务器，直接在浏览器中运行（通过 `preact/compat` 兼容 React API）
- **双通道支持**：默认 `gemini-3-pro-image-preview`（`https://generativelanguage.googleapis.com`）；新增 OpenAI 兼容通道 `gpt-image-2.5-flare / gpt-image-2.5-sunburst`（默认接口 `https://ai98pro.xyz/v1`，兼容 `openai/` 前缀）。模型/接口统一在 `API 配置管理` 中维护，设置面板仅切换已存方案并自动识别通道类型
- **多模态交互**：
  - 支持文本对话
  - 支持图片上传与分析（最多 14 张参考图片，超限自动截断）
  - 支持在页面任意位置粘贴剪贴板图片，自动加入参考图列表
  - **✨ 拖拽上传**：将图片直接拖拽到输入框上传，拖拽时蓝色高亮提示，支持多张
  - **🖌️ 内置画板（Excalidraw）**：应用内手绘草图、流程图等，一键导出 PNG 并作为参考图参与生成（计入 14 张上限），跟随浅色/深色主题
  - **✨ `/t` 快速选词**：输入框输入 `/t` 唤起 `PromptQuickPicker` 快速检索提示词库

### 🖼️ 图片功能

- **📥 上传**：点击（📷）、拖拽、全局粘贴、画板导出四种来源
- **💾 一键下载**：生成图片/思维链图片悬停显示下载按钮，点击查看大图，自动命名 `gemini-image-{时间戳}.{扩展名}`
- **📚 图片历史记录**：
  - 自动收集所有生成的图片（最多保留 100 张，含 `inlineData` 和 Markdown 内 `dataURL` 去重提取）
  - 缩略图（200px）存 Zustand + 原图存 IndexedDB（`idb-keyval`），大图预览时懒加载原图，自动迁移/清理坏数据
  - 2x2 网格预览，按提示词搜索过滤
  - 点击全屏查看 + 提示词详情，支持复制提示词、一键复用提示词到输入框、单张下载/删除、左右切换、一键清空
  - 数据持久化（`gemini-pro-storage`）

### 📝 提示词库

- 内置 `public/prompts.json`（当前 329 条），分类：`NSFW / 学习 / 工作 / 有趣 / 游戏 / 生活`
- 字段：`title / preview / prompt / author / link / mode(edit|generate) / category`
- 顶部 ✨ 按钮打开 `PromptLibraryPanel`：分类筛选、一键填入输入框；输入框 `/t` 唤起快捷选择器（支持键盘上下选择）
- `services/promptService.ts`：24 小时 `localStorage` 缓存，失败回退过期缓存
- `scripts/merge_prompts.py`：合并去重脚本，按 `prompt` 精确去重并补全 `preview/link` 空字段

### 🎨 风格保持（StylePanel）

- 顶部调色板按钮打开：`画风（artStyle）+ 角色列表（name/description/enabled 开关，支持新增/编辑/删除）+ 画面内容描述`
- 一键拼装为 `画风: ...\n角色: ...\n画面内容: ...` 追加到输入框
- 自动写入历史（最多 50 条，持久化到 `ui-storage`），支持重新应用/删除

### 🔀 OpenAI 图片通道（新增）

- **模型**：`gpt-image-2.5-flare`、`gpt-image-2.5-sunburst`（`services/openaiImageService.ts`，`isOpenAIModel` 自动识别 `gpt-image* / *flare* / *sunburst*`，兼容 `openai/` 前缀；`normalizeOpenAIModel` 去前缀）
- **接口**：无参考图 → `POST {base}/images/generations`；有参考图（1~14 张）→ `POST {base}/images/edits`（multipart 多 `image` 字段，已实测多图）；返回 `b64_json`（兼容 `url` 回退下载转码），`revised_prompt` 作为文本展示。URL 必须带 `/v1`，如 `https://ai98pro.xyz/v1`（尾部 `/` 会自动 trim）；Google 默认 Endpoint 下自动回退到该地址
- **映射与限制**：`Auto/1:1 → 1024x1024`，`3:4/9:16 → 1024x1536`，`4:3/16:9 → 1536x1024`（分辨率档暂按长宽比映射）；无思考过程、无真流式（流式开关打开时一次性返回）、无联网搜索、无对话记忆（history 不上传）
- **跨域说明**：纯前端直连要求供应商支持 CORS。如 `ai98pro` 不支持浏览器跨域（`OPTIONS 403`、无 `ACAO` 头），`curl` 能通但浏览器会 `Failed to fetch`，此时直接提示 `浏览器直连失败：该供应商不支持跨域（CORS），请切换到支持浏览器直连的供应商`，请换源（不做本地代理）
- **UI 联动**：`ChatInterface` 按模型自动路由（OpenAI 无思考计时、空态标题跟随模型）；切到 OpenAI 方案自动关闭 Grounding/思考；设置面板 `配置方案` 列表显示 `名称 + 模型 · OpenAI/Gemini通道` 与 `使用中` 状态；图片历史 `modelName` 正常记录

### 💭 思考状态与思维链（Gemini 通道）

- **思考指示器**：长思维链时实时显示阶段轮播（思考中/分析上下文/连接思路/生成回复/完善细节）+ 耗时统计
- **思维链可视化**：可折叠 UI 展示 `thought=true` 的 parts，显示思考耗时；请求历史时自动过滤 `thought` parts，避免回传

### 💬 对话管理

- 流式（`generateContentStream` 逐 token 累加渲染）/ 非流式可切换；生成中可一键停止（`AbortController`）
- 单条消息删除、从某条重新生成（`sliceMessages` 截断后重发）
- 自动滚动到底部，`ErrorBoundary` 兜底渲染错误
- `ReactMarkdown + remark-gfm`：代码块、表格、列表、引用，自动解析 Markdown 内嵌 `data:image` 并提供下载

### 🎨 现代化 UI/UX

- **流畅交互**：流式打字机效果，组件 `lazyWithRetry（3次重试）+ requestIdleCallback 预加载`，开屏 Splash 淡出
- **交互反馈**：`ToastContainer`（3s 自动消失）+ `GlobalDialog`（URL 配置确认、2K/4K 流式警告等）
- **主题切换**：Light / Dark / System 跟随，实时监听系统变化，同步 `meta theme-color`
- **响应式**：桌面端设置侧边栏常驻（`sm:w-80`），移动端全屏抽屉 + 背景点击关闭；移动端回车换行、桌面端回车发送

### ⚙️ 高度可配置

- **API 设置**：首次弹窗输入 Key（高级设置含 3 个模型预设一键填模型+接口，另可手动改模型名/接口）；`ApiConfigDialog` 保存多套配置（名称/Key/接口/模型），一键应用/编辑/删除，持久化；设置面板仅切换已存方案（无手动输入框），底部显示当前接口/模型
- **图像参数**：分辨率 `1K / 2K / 4K` + 长宽比 `Auto / 1:1 / 3:4 / 4:3 / 9:16 / 16:9`（带图形预览）。注意：切到 2K/4K 会自动关闭流式，手动开启流式会弹窗警告可能内容不完整
- **Grounding**：Google Search 开关，联网获取实时信息
- **思考/流式开关**：`enableThinking（includeThoughts）/ streamResponse` 独立控制
- **安全隐私**：Key、设置、多 API 配置、图片缩略图、风格设置均持久化到浏览器 IndexedDB（`idb-keyval`），刷新不丢失；图片原图单独 `image_data_{id}` 存储，不占 State

## 🛠️ 技术栈

- **核心框架**: [Preact 10](https://preactjs.com/)（`preact/compat` 别名 `react/react-dom`）
- **构建工具**: [Vite 7](https://vitejs.dev/)（`@preact/preset-vite` + `@tailwindcss/vite`，`google-genai/markdown-libs` 分包）
- **语言**: [TypeScript](https://www.typescriptlang.org/)
- **样式方案**: [Tailwind CSS 4](https://tailwindcss.com/)
- **状态管理**: [Zustand](https://github.com/pmndrs/zustand)（`persist + createJSONStorage`）
- **本地存储**: `idb-keyval`（IndexedDB）
- **AI SDK**: [Google GenAI SDK](https://www.npmjs.com/package/@google/genai)（`@google/genai@^1.30.0`，动态 `import`）
- **图标库**: [Lucide React](https://lucide.dev/)
- **Markdown**: React Markdown + Remark GFM
- **画板组件**: [Excalidraw](https://github.com/excalidraw/excalidraw)（`@excalidraw/excalidraw`）

## 🚀 快速开始

### 前置要求

- Node.js `>=18`（`package.json engines` 约束）
- Google Gemini API Key（[在此获取](https://aistudio.google.com/app/apikey))

```bash
npm install
npm run dev      # 默认 http://localhost:3003/（见 vite.config.ts server.port）
npm run build    # vite build
npm run preview  # vite preview
```

## ⚙️ 使用说明

### 1. 配置 API Key 与方案

首次进入无 Key 时弹窗提示输入 **API Key**，展开高级设置可见 3 个模型预设（`gemini-3-pro-image-preview / gpt-image-2.5-flare / gpt-image-2.5-sunburst`，点预设自动填模型+接口），也可手动改模型名/接口地址。

> 注意：Key 持久化在浏览器 IndexedDB（`gemini-pro-storage`）中，下次自动加载。OpenAI 通道 URL 必须带 `/v1`。多套方案请在 `API 配置管理` 中新增（如 `接口 https://ai98pro.xyz/v1 + 模型 gpt-image-2.5-sunburst`），设置面板仅做切换。

### 2. URL 参数配置

支持通过 URL 参数预设，检测到与当前不同时会弹窗二次确认，应用后自动清理 URL：

- `apikey`: 预填 API Key
- `endpoint`: 自定义 API 端点（Base URL）
- `model`: 自定义模型名

**示例：**
```
http://localhost:3003/?apikey=AIza...&endpoint=https://my-proxy.com&model=gemini-3-pro-image-preview
```

### 3. 输入与图片来源

- **点击上传**：输入框左侧 📷 图标，最多 14 张
- **拖拽上传**：拖到输入框区域，蓝色高亮后松开
- **粘贴上传**：页面任意位置 `Ctrl/Cmd+V` 剪贴板图片
- **画板绘制**：输入框左侧 🎨 图标打开全屏 Excalidraw，右上保存为 PNG 自动加入附件
- **快捷提示词**：输入 `/t` 唤起快速选择器，回车填入
- 发送中按钮变为停止按钮，可中断流式请求；`Enter` 发送（移动端除外），`Shift+Enter` 换行

### 4. 提示词库

点击顶部 ✨ 打开：分类切换 + 一键填入输入框。数据源为本地 `/prompts.json`，带 24h 缓存。

合并新词库：
```bash
python3 scripts/merge_prompts.py <in1.json> <in2.json> <out.json>
# 按 prompt 去重，自动补全 preview/link 空字段
```

### 5. 风格保持

点击顶部调色板按钮：填写画风、增删/启用角色、填写画面内容 → 应用到输入框。历史记录可一键回填面板。

### 6. 图片历史记录

点击顶部 🖼️（有图时蓝色脉冲徽章）：

- 网格预览 + 提示词搜索
- 点击全屏：复制提示词 / 复用到输入框 / 下载原图 / 删除
- 顶部垃圾桶清空全部（同步清理 IndexedDB 原图）

### 7. 高级设置

点击右上角 ⚙️：

- `配置方案`：切换 `API 配置管理` 中的已存方案，自动识别 OpenAI/Gemini 通道（OpenAI 方案切后自动关联网搜索/思考过程）
- 图像分辨率、长宽比、Google 搜索定位（OpenAI 置灰）、显示思考过程（OpenAI 置灰）、流式响应（OpenAI 无真流式，效果一致）
- `编辑 API 配置`：多配置增删改查与应用（模型/接口的增改都在这里）
- 底部显示当前接口地址与模型
- 顶部栏：新对话（清空消息）、风格、历史、提示词库、主题切换、GitHub、设置

消息气泡支持：折叠思考过程、图片下载/放大、删除消息、从此重新生成。

## 📂 项目结构

```
src/
 ├── components/
 │   ├── ui/
 │   │   ├── ToastContainer.tsx     # Toast 通知
 │   │   └── GlobalDialog.tsx       # 全局确认/提示框
 │   ├── ApiKeyModal.tsx            # 首次 API Key 输入（含模型预设+高级设置）
 │   ├── ApiConfigDialog.tsx        # 多套 API 配置管理
 │   ├── ChatInterface.tsx          # 主聊天区（发送/停止/重生成/滚动）
 │   ├── InputArea.tsx              # 输入框（点击/拖拽/粘贴/画板//t）
 │   ├── PromptQuickPicker.tsx      # /t 快捷提示词选择器
 │   ├── PromptLibraryPanel.tsx     # 提示词库面板
 │   ├── StylePanel.tsx             # 风格保持面板
 │   ├── MessageBubble.tsx          # 消息气泡（Markdown/图片/思考折叠）
 │   ├── ThinkingIndicator.tsx      # 思考中指示器
 │   ├── ImageHistoryPanel.tsx      # 图片历史（搜索/预览/复用/下载）
 │   ├── DrawingBoard.tsx           # Excalidraw 画板封装
 │   └── ErrorBoundary.tsx          # 渲染错误边界
 ├── services/
 │   ├── geminiService.ts           # GenAI 流式/非流式封装、错误中文映射
 │   ├── openaiImageService.ts        # OpenAI 兼容图片通道（generations/edits） ✨
 │   └── promptService.ts           # prompts.json 加载 + 分类 + 缓存
 ├── store/
 │   ├── useAppStore.ts             # Key/设置/消息/图片历史/API配置（IndexedDB持久化）
 │   └── useUiStore.ts              # Toast/Dialog/风格设置/提示词历史（IndexedDB持久化）
 ├── utils/
 │   ├── imageUtils.ts              # base64/Blob/下载/缩略图
 │   ├── extractImagesFromParts.ts  # 从 inlineData + Markdown dataURL 提取图片
 │   ├── messageUtils.ts            # ChatMessage -> GenAI Content（含 thought 过滤）
 │   └── lazyLoadUtils.ts           # lazyWithRetry + 空闲预加载
 ├── shims/                         # 类型/兼容垫片
 ├── types.ts                       # AppSettings/Content/ChatMessage/Attachment/ImageHistoryItem/PromptItem
 ├── App.tsx                        # 根组件（主题/URL参数/顶栏/侧边栏/弹窗挂载）
 ├── index.tsx                      # 入口（挂载 + Splash 移除）
 └── index.css                      # Tailwind + dark variant + 动画/滚动条
public/
 ├── logo.svg
 ├── prompts.json                   # 329 条提示词库
 └── 4*4.png                        # 示例预览图
scripts/
 └── merge_prompts.py               # 提示词合并去重
index.html                          # 标题 Nano Banana Pro 在线客户端 + Splash
vite.config.ts                      # port 3003 + preact/tailwind + react别名 + 分包
package.json                        # undydraw@0.1.0
```

## 🎯 功能对比

| 功能 | 原版 | 当前版本 |
|------|------|----------|
| 图片上传 | ✅ 点击上传 | ✅ 点击 + 拖拽 + 粘贴 + 画板 |
| 图片下载 | ❌ 需右键另存为 | ✅ 悬停/全屏一键下载 |
| 图片历史 | ❌ 无 | ✅ 100张 + 搜索/复制/复用 + IndexedDB |
| 画板绘图 | ❌ 无 | ✅ 内置 Excalidraw 全屏绘制 + 一键导出 |
| 提示词库 | ❌ 无 | ✅ 329条本地库 + /t 快捷唤起 |
| 风格保持 | ❌ 无 | ✅ 画风+角色+内容 + 50条历史 |
| 多API配置 | ❌ 无 | ✅ 保存/切换多套 Key/接口/模型（设置面板仅切换） |
| OpenAI通道 | ❌ 无 | ✅ flare/sunburst 双模型，generations/edits，CORS失败直提示换源 |
| 对话管理 | 基础 | ✅ 删除/重生成/停止/思考折叠 |

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

提示词贡献：准备两个 JSON 数组文件后用 `scripts/merge_prompts.py` 合并去重再提交 `public/prompts.json`。

## 📄 License

AGPL-3.0-only（见 `LICENSE`，`package.json license` 一致）

## 🙏 致谢

- 原项目：[faithleysath/UndyDraw](https://github.com/faithleysath/UndyDraw)
- 本仓库：[Honghurumeng/gemini_image_playground](https://github.com/Honghurumeng/gemini_image_playground)
