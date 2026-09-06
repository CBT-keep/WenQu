# WenQU — 个人知识库问答（RAG）

Spring Boot 4 + MyBatis + MySQL + Redis 的个人知识库应用：上传文档 → 分块向量化 → 语义检索 → 流式问答。前端单页（终端 + GUI 双模式），随应用一同托管。

## 功能总览

- **知识库管理**：创建/编辑/删除，回收站（恢复/永久删除/批量操作，恢复需密码认证）
- **文档处理**：上传 txt/md/docx/pdf 等，Tika 抽取文本，按知识库配置分块，本地 Ollama 向量化入库；异步处理、状态可查、失败可重处理
- **语义检索**：问题向量化 → 余弦相似度 → Top-K 引用
- **聊天问答**：云端 LLM 流式回答（SSE），Markdown 实时渲染（含历史消息），自定义人设（内置猫娘助理），会话与消息历史落库
- **认证安全**：JWT 双 token（access/refresh）、Redis 黑名单、refresh 轮换无感刷新、管理员秒踢
- **多用户**：注册邀请码，数据按用户隔离

## 整体链路

```
文档入库：
  上传 → Tika 抽取文本 → 按分块配置切分 → Ollama /api/embed 向量化 → doc_chunk(JSON向量) 落库
       └─ 异步执行（独立线程池），失败可重新处理

问答：
  提问 → 问题向量化 → 全库分块余弦相似度 Top-4 → 组装 prompt（人设+参考片段+近10条历史）
       → 云端 LLM /chat/completions 流式 → 手写 SSE 逐段下发 → 回答+会话落库

认证：
  登录 → access(30min) + refresh(7d) 双 token，refresh 会话登记 Redis
  → 请求带 access，过期后前端自动用 refresh 换新双 token（轮换，旧作废）并重试原请求
  → 登出：access 进黑名单 + refresh 会话作废
  → 秒踢：删 refresh 会话 + 记录踢出时间，早于该时间的 access 一律拒绝
```

## 快速开始

### 1. 环境要求

- JDK 17+
- MySQL 8.x
- Redis（认证状态存储：黑名单 / refresh 会话 / 秒踢标记）
- 本地 Ollama + 向量化模型（仅向量化用）：
  ```bash
  ollama pull nomic-embed-text
  ```
- 任一 OpenAI 兼容的云端 LLM 服务（智谱 / 硅基流动 / OpenCode Zen / OpenAI 等），仅聊天问答用

### 2. 建库

执行 `src/main/resources/schema.sql`（含建库与建表）。

### 3. 配置

`application.yaml` 为公开配置（可安全提交 GitHub）：所有敏感项均为 `${环境变量:默认值}` 占位符，密钥默认为空，缺密钥时启动会有明确报错提示。

真实密钥写在项目根目录 `application-local.yaml`（**已加入 `.gitignore`，不会入库**；启动时自动查找当前目录与上级目录两处，从 `WenQU/` 或仓库根目录运行都能找到）：

```yaml
# application-local.yaml —— 不入库
spring:
  datasource:
    password: <数据库密码>

jwt:
  secret: <足够长的随机字符串>

ai:
  base-url: https://opencode.ai/zen/go/v1    # 或智谱/硅基流动等 OpenAI 兼容端点（需带 /v1）
  api-key: <你的 API Key>
  chat-model: glm-5.3-flash
```

也可以不用本地文件，全部走环境变量：`DB_PASSWORD`、`JWT_SECRET`、`AI_BASE_URL`、`AI_API_KEY`、`AI_CHAT_MODEL`、`REDIS_PASSWORD`。

其余公开配置（非敏感，直接改 application.yaml）：

```yaml
spring:
  data:
    redis:
      host: localhost
      port: 6379

ai:
  temperature: 0.7                           # 过低会机械生硬
  # max-tokens: 1024                         # 限制单次输出长度，缩短等待

ollama:
  model: nomic-embed-text
  dimensions: 768                            # 必须与模型实际输出维度一致

jwt:
  access-expiration: 1800                    # access 有效期（秒）
  refresh-expiration: 604800                 # refresh 有效期（秒）

wenqu:
  register:
    invite-codes: WENQU-2026                 # 注册邀请码，逗号分隔；留空关闭注册
```

API Key 通过环境变量注入示例：

```bash
# Windows PowerShell
$env:AI_API_KEY = "sk-xxx"
# Linux / macOS
export AI_API_KEY=sk-xxx
```

### 4. 启动

```bash
./mvnw.cmd spring-boot:run     # Windows
./mvnw spring-boot:run         # Linux / macOS
```

打开 http://localhost:8080 ，注册账号登录即可。

## 关键配置说明

| 配置 | 说明 |
| --- | --- |
| `ollama.model` / `ollama.dimensions` | 向量化模型与输出维度，入库时校验。**更换后需清空 `doc_chunk` 表并重新处理文档**，否则新旧维度混杂会导致检索报错 |
| `ai.base-url` / `ai.chat-model` | 聊天问答用的 OpenAI 兼容端点与模型 |
| `ai.temperature` / `ai.max-tokens` | 生成温度（0.7 左右自然）与单次回答长度上限 |
| `jwt.access-expiration` / `jwt.refresh-expiration` | 双 token 有效期，同时决定 Redis 键 TTL |
| `jwt.secret` | 生产环境务必替换，且不要提交仓库 |
| `wenqu.register.invite-codes` | 注册邀请码，留空关闭注册 |

## 技术要点

### 认证体系（双 token + Redis）

| Redis 键 | 用途 | TTL |
| --- | --- | --- |
| `wq:auth:blacklist:{jti}` | access token 黑名单（登出/被踢时拉黑） | 剩余有效期 |
| `wq:auth:refresh:{userId}:{jti}` | refresh 会话登记，刷新时校验并轮换（防重放） | refresh 有效期 |
| `wq:auth:kick:{userId}` | 秒踢时间戳，签发时间早于它的 access 一律拒绝 | refresh 有效期 |

- access token 携带 `jti`（定位黑名单）与 `uid`（秒踢校验）claim，`typ` 区分 access/refresh——refresh token 拿来当 access 用会被直接拒绝
- 无感刷新：前端收到 40100/40101 → `POST /api/auth/refresh` → 轮换出新双 token → 重试原请求；并发请求共享同一次刷新
- 秒踢：`POST /api/auth/kick/{userId}`（ADMIN 角色），立即失效目标用户全部 token
- 服务器重启不丢状态：全部认证状态在 Redis

### 聊天链路（SSE）

- 端点 `POST /api/chat/stream`，SSE 事件：`meta`（会话 id）→ `delta`（增量）→ `done`（全文）→ `error`
- 线协议手写（`event: xxx\ndata: {...}\n\n`）：Spring `SseEmitter` 的 `event:`/`data:` 冒号后无空格，与前端解析器不匹配
- 同步阶段（校验/检索/提问落库）失败走全局异常处理返回标准 JSON；流式阶段失败发 `error` 事件
- 流式渲染节流：delta 只累积文本，约 60ms 渲染一次，`done` 渲染终稿——避免每 token 全量重解析 Markdown 的 O(n²) 卡顿

### 其他

- **文档处理异步化**：独立线程池 `docTaskExecutor`，不占请求线程
- **人设可调**：系统提示词集中在 `ChatServiceImpl#buildSystemPrompt`（内置猫娘人设 + 知识库回答规则）
- **已知限制**：向量检索为全量拉取 + 内存余弦计算，分块量大后需引入向量索引；秒踢接口暂无前端入口（需 ADMIN 角色账号调用）；API Key 建议走环境变量，勿明文提交

## 技术栈

- 后端：Spring Boot 4（WebMVC + Security + Validation + Data Redis）、MyBatis、PageHelper、Tika、JJWT
- 前端：原生 HTML/CSS/JS 单页（终端 + GUI 双模式），手写轻量 Markdown 渲染器，SSE 流式渲染
- 存储：MySQL（业务数据 + 向量 JSON）、本地磁盘（上传原件，`wenqu.upload-dir`）、Redis（认证状态）

## 目录结构（主要）

```
src/main/java/com/xia/wenqu/
├── config/        # AiProperties（云端 LLM）、SecurityConfig、AsyncConfig
├── controller/    # Auth / KnowledgeBase / Document / Conversation / Chat / Recycle
├── service/       # EmbeddingService、LlmService、RetrievalService、ChatService 等
│   └── impl/      # OpenAI 兼容流式实现（OpenAiLlmServiceImpl）等
├── security/      # JWT 过滤器、RedisTokenStore、登录用户、密码校验
├── mapper/        # MyBatis 接口（XML 在 src/main/resources/mapper/）
└── utils/         # JwtUtil（双 token 签发/解析）
src/main/resources/
├── schema.sql     # 建库建表脚本
├── mapper/*.xml   # MyBatis SQL
└── static/        # 前端单页
```
