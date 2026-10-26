# WenQu · 前端

React + TypeScript + Vite 单页应用。设计与页面参照 `doc/prototype/wenqu-prototype.html`
（布局范式）与 `doc/prototype/wenqu-style-preview.html`（v3 暖色设计令牌）；接口以
`doc/04-API接口规范.md` 为准。

## 技术栈

| 类别 | 选型 |
|---|---|
| 构建 | Vite 8 |
| 框架 | React 19 + TypeScript |
| 路由 | React Router v7 |
| 服务端状态 | TanStack Query |
| 客户端状态 | Zustand |
| 样式 | Tailwind CSS v4（令牌见 `src/index.css`） |
| 组件 | shadcn（base-ui）+ 自研业务组件 |
| 图表 | ECharts（按需引入 core） |
| 图标 | lucide-react |

## 运行

```bash
pnpm install
pnpm dev      # http://localhost:5173（/api 代理到 :8080）
pnpm build    # tsc -b && vite build
pnpm lint
```

## 契约优先 + 可开关 Mock 层

后端已有 `auth` / `users` / 模型配置，以及知识库列表、创建、详情、编辑、统计、文档列表与分片查看接口。
模型配置的已保存与草稿连通性测试均调用真实接口，展示耗时及 Chat 回显；编辑后的草稿测试需填写 API Key，不会自动保存配置。
知识库详情在真实模式下暂不开放上传、下载、删除、重试、重建和分片修改，待文档处理链路完成后启用。
Chat、SQLBot、系统管理尚未实现，
前端按 doc/04 契约把请求写好，再通过 `VITE_MOCK` 决定是否短路成本地 Mock：

```dotenv
# frontend/.env.development
VITE_MOCK=chat,sqlbot,model,system  # all | none | 模块名逗号分隔
```

- 每个 `src/api/*.ts` 函数：`mockEnabled(模块)` 为真 → 返回 `src/mock/*` 的数据；否则走真实 `/api/v1`。
- 后端每就绪一个模块，把它从 `VITE_MOCK` 里去掉即可切真实，**页面与业务代码零改动**。
- 生产构建 `.env.production` 为 `VITE_MOCK=none`，Mock 分支永不执行。
- Mock 带轻微延迟与"活"的状态机（上传后文档会自行 `PENDING → READY`、SSE 逐字推流），
  便于在无后端时演示轮询、骨架屏与流式输出。
- 后端全量就绪后，删掉 `src/mock/**` 与各 api 里的 mock 分支即可。

## 目录结构

```
src/
├── api/          # 按模块封装请求（auth/users/kb/chat/sqlbot/model/system）
├── mock/         # 内存 Mock（仅开发期；后端就绪后可整体删除）
├── components/
│   ├── chat/     # 会话域：composer / chip-select / rich-text / sql-block / result-view …
│   ├── layout/   # PageHeader / Panel / StatCard / Toolbar / Chip
│   ├── ui/       # 基础原子组件（button/input/select/modal/tag/seg/switch/feedback/echart…）
│   ├── app-shell / sidebar / toast-host / theme-toggle …
├── hooks/        # use-theme / use-conversations / use-typewriter …
├── lib/          # http / token / sse / download / chart / format / status / styles / mock
├── pages/        # 与原型一一对应的页面（settings/ 为 4 个 tab 的子目录）
├── stores/       # zustand（auth / toast）
├── types/        # 与 doc/04 字段一一对应的 TS 类型
└── router/       # 路由与权限守卫
```

## 路由

| 路由 | 页面 | 权限 |
|---|---|---|
| `/login` | 登录（翻卡） | 公开 |
| `/change-password` | 修改密码（首登强制） | 登录 |
| `/chat` | 对话欢迎态（模式/知识库/模型/数据源可选） | 登录 |
| `/chat/rag/:id` | RAG 问答会话（SSE 流式 + 引用） | 登录 |
| `/chat/sql/:id` | SQLBot 查询会话（SSE + 表格/图表） | 登录 |
| `/kb` `/kb/:id` `/kb/:id/retrieve` | 知识库列表 / 详情（文档·分片）/ 检索测试 | 登录 |
| `/sqlbot/datasources` `/sqlbot/datasources/:id/tables` | 数据源管理 / 表结构浏览 | 登录（数据源仅本人） |
| `/dashboard` | 数据总览 | ADMIN+ |
| `/settings?tab=users｜models｜parameters｜logs` | 设置 4 tab | SUPERADMIN |

前端按 `/auth/me` 的 `role` 控制菜单显隐与路由守卫，这**只是体验层**，后端必须独立鉴权
（doc/04 附录 §6）。

## 约定

- 请求统一走 `lib/http.ts` 的 axios 实例：自动注入 Bearer、`401/20003` 静默刷新、失败跳登录。
- 统一响应体拆包用 `unwrap()`；`code≠0` 抛 `ApiError`，UI 用 `toApiError(e).message` 提示。
- SSE（`POST + text/event-stream`）用 `lib/sse.ts` 的 `postSse`（fetch 流式读取，原生 EventSource 不支持 POST + Header）。
- 下载 / 导出走 `lib/download.ts`：`fetch → blob → objectURL`，从 `Content-Disposition` 解析文件名。
- 时间统一按本地时区渲染（`lib/format.ts`），后端返回 ISO8601 UTC。
- 命名：请求 / 响应体与查询参数一律 camelCase；类型集中在 `src/types/`。
- 现有 lint 仅 `react/set-state-in-effect` 等 warning（表单初始化 / 首屏自动选中），非错误。
