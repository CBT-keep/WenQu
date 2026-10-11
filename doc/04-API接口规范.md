# 04 · API 接口规范

> 返回 [索引](./README.md) · 上一篇 [数据库设计](./03-数据库设计.md) · 下一篇 [开发文档](./05-开发文档.md)
>
> 本文是前后端联路的**唯一契约**。所有路径、字段、错误码以本文为准。
> 版本：`v1` · 基地址（开发）：`http://localhost:8080`

---

# 第一部分 · 全局约定

## 1.1 基地址与前缀

| 环境 | 基地址 | 说明 |
|---|---|---|
| 开发 | `http://localhost:8080/api/v1` | 前端 Vite 代理 `/api` → `:8080` |
| 测试/生产 | `https://{host}/api/v1` | 由 Nginx 反代 |

- 所有业务接口统一前缀 `/api/v1`。
- 非业务接口（健康检查、OpenAPI）不带 `/v1`：`/actuator/health`、`/v3/api-docs`、`/swagger-ui/**`。

## 1.2 请求头

| Header | 必填 | 说明 |
|---|---|---|
| `Authorization` | 需鉴权的接口必填 | `Bearer {accessToken}` |
| `Content-Type` | 有请求体时必填 | `application/json`；上传为 `multipart/form-data` |
| `Accept` | SSE 接口必须为 | `text/event-stream`；其余默认 `application/json` |
| `X-Request-Id` | 否 | 前端可传，用于链路追踪；不传由后端生成并回写响应头 |
| `Accept-Language` | 否 | `zh-CN` / `en-US`，预留多语言 |

## 1.3 统一响应体

**成功**

```json
{
  "code": 0,
  "message": "success",
  "data": { },
  "traceId": "b1f2c3d4e5f6"
}
```

**失败（业务异常）**

```json
{
  "code": 40002,
  "message": "文档解析失败：Tika 解析超时",
  "data": null,
  "traceId": "b1f2c3d4e5f6"
}
```

| 字段 | 类型 | 说明 |
|---|---|---|
| `code` | int | `0` 表示成功；非 0 为业务错误码（见 1.5） |
| `message` | string | 人类可读信息，可直接提示用户 |
| `data` | object/array/null | 业务数据；失败时为 `null` |
| `traceId` | string | 链路 ID，排障时提供给后端 |

### HTTP 状态码策略（混合式）

| HTTP | 场景 | 响应体 |
|---|---|---|
| `200` | 业务处理完成 | `code=0` 成功；`code≠0` 业务失败 |
| `201` | 资源创建成功 | `code=0`，`data` 含新资源 |
| `400` | 参数校验失败 | `code=10001` |
| `401` | 未认证 / Token 失效 | `code=20003` |
| `403` | 无权限 | `code=20006` |
| `404` | 路径不存在 | `code=10002` |
| `409` | 资源冲突 | `code=10003` |
| `413` | 文件过大 | `code=40004` |
| `500` | 服务端异常 | `code=99999` |

> 约定：能明确对应 HTTP 语义的用状态码；**业务规则类错误**（如"SQL 安全校验不通过"）仍返回 `200` + 非 0 `code`，便于前端统一处理。

## 1.4 分页约定

**请求参数**（所有列表接口通用）

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `page` | int | `1` | 页码，从 1 开始 |
| `size` | int | `20` | 每页条数，范围 1–100 |
| `sort` | string | 各接口约定 | 排序字段（蛇形命名，如 `updated_at`） |
| `order` | string | `desc` | `asc` / `desc` |

**响应结构**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "page": 1,
    "size": 20,
    "total": 137,
    "pages": 7,
    "records": [ ]
  },
  "traceId": "b1f2c3d4e5f6"
}
```

## 1.5 错误码表

| 码段 | 模块 | 码 | 含义 |
|---|---|---|---|
| 0 | 通用 | `0` | 成功 |
| 10xxx | 通用 | `10001` | 参数校验失败 |
| | | `10002` | 资源不存在 |
| | | `10003` | 资源冲突（名称重复等） |
| | | `10004` | 操作不允许 |
| | | `10005` | 请求频率过高 |
| 20xxx | 认证鉴权 | `20001` | 用户名或密码错误 |
| | | `20002` | 账号已被禁用 |
| | | `20003` | Token 无效或已过期 |
| | | `20004` | Refresh Token 无效或已吊销 |
| | | `20005` | 账号已锁定，请稍后重试 |
| | | `20006` | 无权限访问该资源 |
| | | `20007` | 原密码错误 |
| 30xxx | 模型 | `30001` | 模型不存在或已禁用 |
| | | `30002` | 模型连通性测试失败 |
| | | `30003` | 模型调用失败（超时/限流/协议错误） |
| | | `30004` | 该类型已存在默认模型 |
| 40xxx | 知识库 | `40001` | 知识库不存在 |
| | | `40002` | 文档解析失败 |
| | | `40003` | 不支持的文档格式 |
| | | `40004` | 文件超出大小/数量限制 |
| | | `40005` | 向量化失败 |
| | | `40006` | 向量维度不匹配 |
| | | `40007` | 对象存储操作失败 |
| | | `40008` | 分片不存在 |
| 50xxx | 问答 | `50001` | 会话不存在 |
| | | `50002` | 对话生成失败 |
| | | `50003` | 流式连接中断 |
| | | `50004` | 未指定可用 Chat 模型 |
| 60xxx | SQLBot | `60001` | 数据源不存在 |
| | | `60002` | 数据源连接失败 |
| | | `60003` | Schema 同步失败 |
| | | `60004` | SQL 语法错误 |
| | | `60005` | SQL 安全校验不通过 |
| | | `60006` | SQL 执行超时 |
| | | `60007` | 查询结果超出导出上限 |
| | | `60008` | 未配置可用数据源 |
| 70xxx | 系统 | `70001` | 系统参数非法 |
| | | `70002` | 不可删除当前登录用户 |
| 99xxx | 兜底 | `99999` | 服务端内部错误 |

## 1.6 鉴权与令牌

- 登录成功返回 `accessToken`（默认 120 分钟）与 `refreshToken`（默认 7 天）。
- 除白名单外所有接口需要 `Authorization: Bearer {accessToken}`。
- 收到 `401 / 20003` 时，前端用 `refreshToken` 调 `/auth/refresh` 换新令牌；刷新失败则跳登录页。
- 登出调用 `/auth/logout`，后端吊销 refreshToken（写入 `sys_refresh_token.revoked`）。

**JWT Payload 约定**

```json
{
  "sub": "1001",
  "username": "admin",
  "role": "SUPERADMIN",
  "jti": "9f8e7d6c",
  "iat": 1760000000,
  "exp": 1760007200
}
```

白名单（无需鉴权）：`POST /auth/login`、`POST /auth/refresh`、`GET /actuator/health`、`/v3/api-docs/**`、`/swagger-ui/**`。

## 1.7 SSE 流式协议（对话类接口）

用于：RAG 问答、NL2SQL 查询。请求方式为 `POST` + `Accept: text/event-stream`。

**响应头**

```
Content-Type: text/event-stream; charset=utf-8
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**事件格式**：标准 SSE，`event:` + `data:`（JSON 单行）。

```
event: meta
data: {"conversationId":88,"messageId":1024}

event: retrieval
data: {"references":[{"index":1,"documentId":7,"documentName":"产品使用手册 v3.2.pdf","chunkId":1280,"score":0.951,"snippet":"…"}]}

event: delta
data: {"content":"管理员"}

event: delta
data: {"content":"密码重置"}

event: usage
data: {"promptTokens":812,"completionTokens":426,"model":"gpt-4o-mini"}

event: done
data: {"messageId":1024,"finishReason":"stop"}
```

**RAG 问答事件类型**

| event | 时机 | data 关键字段 |
|---|---|---|
| `meta` | 连接建立后立即 | `conversationId`, `messageId` |
| `retrieval` | 检索完成后（生成前） | `references[]`：`index, chunkId, documentId, documentName, kbId, score, snippet` |
| `delta` | 每个增量 token | `content` |
| `usage` | 生成结束 | `promptTokens`, `completionTokens`, `model` |
| `done` | 正常结束 | `messageId`, `finishReason`（`stop`/`length`/`abort`） |
| `error` | 异常 | `code`, `message`（此时不再发送 `done`） |
| `: ping` | 每 15s 心跳 | 无 data |

**NL2SQL 事件类型**

| event | 时机 | data 关键字段 |
|---|---|---|
| `meta` | 连接建立 | `conversationId`, `messageId` |
| `reasoning` | 可选，选表/思考摘要 | `content`（纯文本，可流式多条） |
| `sql` | SQL 生成完毕 | `sql`, `explanation` |
| `result` | 执行完成 | `columns[]`, `rows[][]`, `rowCount`, `elapsedMs`, `truncated` |
| `chart` | 图表建议 | `type`（`bar`/`line`/`pie`/`table`）, `option`（ECharts option） |
| `done` | 正常结束 | `messageId` |
| `error` | 异常 | `code`, `message` |

**前端消费示例（fetch + ReadableStream）**

```ts
const res = await fetch(`/api/v1/conversations/${id}/messages`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'text/event-stream',
    'Authorization': `Bearer ${accessToken}`,
  },
  body: JSON.stringify({ content: question, stream: true }),
});
const reader = res.body!.getReader();
const decoder = new TextDecoder();
let buf = '';
while (true) {
  const { value, done } = await reader.read();
  if (done) break;
  buf += decoder.decode(value, { stream: true });
  const blocks = buf.split('\n\n');
  buf = blocks.pop()!;
  for (const block of blocks) {
    const ev = /event: (.*)/.exec(block)?.[1];
    const dataLine = /data: (.*)/.exec(block)?.[1];
    if (ev && dataLine) handle(ev, JSON.parse(dataLine));
  }
}
```

> ⚠️ 注意：`POST + SSE` 无法使用浏览器原生 `EventSource`（其只支持 GET）。前端用 `fetch` 流式读取（如上），或用 `@microsoft/fetch-event-source`。
> 若 token 无法放入 Header，可改用 `GET /conversations/{id}/stream?content=...&token=...`，但**不推荐**（token 会进日志）。本期统一用 `POST`。

---

# 第二部分 · 端点总览

> 图例：🔓 无需认证 · 🔑 需登录 · 🛡️ 需 `ADMIN`/`SUPERADMIN` · 👑 需 `SUPERADMIN` · 👤 受归属校验 · ⚡ SSE 流式
>
> **归属校验口径**：知识库 / 文档 / 会话 —— `ADMIN`/`SUPERADMIN` 全可见，`USER` 仅本人；
> **数据源（含连接信息，敏感）** —— 仅 `SUPERADMIN` 全可见，`ADMIN`/`USER` 仅本人。

## Auth

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| POST | `/auth/login` | 🔓 | 登录 |
| POST | `/auth/refresh` | 🔓 | 刷新令牌 |
| POST | `/auth/logout` | 🔑 | 登出（吊销 refreshToken） |
| GET | `/auth/me` | 🔑 | 当前用户信息 |
| PUT | `/auth/me` | 🔑 | 修改本人资料 |
| PUT | `/auth/me/password` | 🔑 | 修改本人密码 |

## Users（SUPERADMIN）

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/users` | 👑 | 用户列表（分页） |
| POST | `/users` | 👑 | 创建用户 |
| GET | `/users/{id}` | 👑 | 用户详情 |
| PUT | `/users/{id}` | 👑 | 编辑用户 |
| DELETE | `/users/{id}` | 👑 | 删除用户 |
| PUT | `/users/{id}/status` | 👑 | 启用/禁用 |
| PUT | `/users/{id}/password` | 👑 | 重置密码 |
| GET | `/users/options` | 🛡️ | 用户下拉（供筛选） |

## Models（SUPERADMIN）

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/models` | 👑 | 模型列表 |
| POST | `/models` | 👑 | 新增模型 |
| GET | `/models/{id}` | 👑 | 模型详情 |
| PUT | `/models/{id}` | 👑 | 编辑模型 |
| DELETE | `/models/{id}` | 👑 | 删除模型 |
| POST | `/models/{id}/test` | 👑 | 连通性测试（已保存） |
| POST | `/models/test` | 👑 | 连通性测试（未保存草稿） |
| PUT | `/models/{id}/default` | 👑 | 设为该类型默认 |
| GET | `/models/options` | 🔑 | 可选模型下拉（按 type） |

## Knowledge Bases

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/knowledge-bases` | 🔑👤 | 知识库列表 |
| POST | `/knowledge-bases` | 🔑 | 创建知识库 |
| GET | `/knowledge-bases/{kbId}` | 🔑👤 | 知识库详情 |
| PUT | `/knowledge-bases/{kbId}` | 🔑👤 | 更新知识库 |
| DELETE | `/knowledge-bases/{kbId}` | 🔑👤 | 删除知识库 |
| GET | `/knowledge-bases/{kbId}/stats` | 🔑👤 | 统计 |
| POST | `/knowledge-bases/{kbId}/retrieve` | 🔑👤 | 检索测试 |
| POST | `/knowledge-bases/{kbId}/reindex` | 🔑👤 | 全库重建索引 |
| GET | `/knowledge-bases/options` | 🔑 | 知识库下拉 |

## Documents & Chunks

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/knowledge-bases/{kbId}/documents` | 🔑👤 | 文档列表（分页） |
| POST | `/knowledge-bases/{kbId}/documents` | 🔑👤 | 上传文档（multipart，多文件） |
| GET | `/documents/{docId}` | 🔑👤 | 文档详情（轮询状态） |
| DELETE | `/documents/{docId}` | 🔑👤 | 删除文档 |
| POST | `/documents/{docId}/reindex` | 🔑👤 | 重建该文档索引 |
| POST | `/documents/{docId}/retry` | 🔑👤 | 失败重试 |
| GET | `/documents/{docId}/download` | 🔑👤 | 获取下载地址（预签名） |
| GET | `/documents/{docId}/chunks` | 🔑👤 | 分片列表（分页） |
| GET | `/chunks/{chunkId}` | 🔑👤 | 分片详情 |
| PUT | `/chunks/{chunkId}` | 🔑👤 | 编辑分片（触发重向量化） |
| DELETE | `/chunks/{chunkId}` | 🔑👤 | 删除分片 |

## Chat（RAG 问答）

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/conversations` | 🔑👤 | 会话列表 |
| POST | `/conversations` | 🔑 | 新建会话 |
| GET | `/conversations/{id}` | 🔑👤 | 会话详情 |
| PUT | `/conversations/{id}` | 🔑👤 | 更新会话（标题/知识库/模型） |
| DELETE | `/conversations/{id}` | 🔑👤 | 删除会话 |
| GET | `/conversations/{id}/messages` | 🔑👤 | 消息列表（分页） |
| POST | `/conversations/{id}/messages` | 🔑👤⚡ | 发送消息（SSE） |
| POST | `/conversations/{id}/stop` | 🔑👤 | 停止生成 |
| PUT | `/messages/{messageId}/feedback` | 🔑👤 | 消息反馈点赞/点踩 |

## SQLBot

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/sqlbot/datasources` | 🔑👤 | 数据源列表 |
| POST | `/sqlbot/datasources` | 🔑 | 新增数据源 |
| GET | `/sqlbot/datasources/{id}` | 🔑👤 | 数据源详情 |
| PUT | `/sqlbot/datasources/{id}` | 🔑👤 | 编辑数据源 |
| DELETE | `/sqlbot/datasources/{id}` | 🔑👤 | 删除数据源 |
| POST | `/sqlbot/datasources/{id}/test` | 🔑👤 | 连接测试（已保存） |
| POST | `/sqlbot/datasources/test` | 🔑 | 连接测试（未保存草稿） |
| POST | `/sqlbot/datasources/{id}/sync-schema` | 🔑👤 | 触发 Schema 同步 |
| GET | `/sqlbot/datasources/{id}/sync-status` | 🔑👤 | 同步状态 |
| GET | `/sqlbot/datasources/{id}/tables` | 🔑👤 | 表列表 |
| GET | `/sqlbot/datasources/{id}/tables/{tableId}` | 🔑👤 | 表详情（含字段） |
| PUT | `/sqlbot/datasources/{id}/tables/{tableId}` | 🔑👤 | 更新表配置（启用/注释） |
| GET | `/sqlbot/datasources/{id}/tables/{tableId}/sample` | 🔑👤 | 样例行 |
| GET | `/sqlbot/conversations` | 🔑👤 | 查数会话列表 |
| POST | `/sqlbot/conversations` | 🔑 | 新建查数会话 |
| GET | `/sqlbot/conversations/{id}` | 🔑👤 | 查数会话详情 |
| DELETE | `/sqlbot/conversations/{id}` | 🔑👤 | 删除查数会话 |
| GET | `/sqlbot/conversations/{id}/messages` | 🔑👤 | 查数消息列表 |
| POST | `/sqlbot/conversations/{id}/messages` | 🔑👤⚡ | 自然语言查询（SSE） |
| POST | `/sqlbot/execute` | 🔑 | 手工执行 SQL |
| POST | `/sqlbot/explain` | 🔑 | 执行计划 |
| POST | `/sqlbot/export` | 🔑 | 导出 CSV/Excel |

## System

| 方法 | 路径 | 权限 | 说明 |
|---|---|---|---|
| GET | `/system/settings` | 👑 | 系统参数列表 |
| PUT | `/system/settings` | 👑 | 批量更新参数 |
| GET | `/system/logs` | 👑 | 操作日志（分页） |
| GET | `/system/logs/{id}` | 👑 | 日志详情 |
| GET | `/system/logs/export` | 👑 | 日志导出 |
| GET | `/system/dashboard/stats` | 🛡️ | 仪表盘汇总 |
| GET | `/system/dashboard/usage` | 🛡️ | 调用量趋势 |
| GET | `/system/health/components` | 🛡️ | 依赖组件健康 |
| GET | `/system/info` | 👑 | 版本/构建信息 |

---

# 第三部分 · 认证与用户

## 3.1 登录

`POST /api/v1/auth/login` · 🔓

**请求体**

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `username` | string | ✅ | 登录名 |
| `password` | string | ✅ | 密码 |

```json
{ "username": "admin", "password": "admin@123" }
```

**成功响应 200**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "tokenType": "Bearer",
    "accessToken": "eyJhbGciOiJIUzI1NiJ9...",
    "refreshToken": "3f2a9c7e-1b4d-...",
    "expiresIn": 7200,
    "mustChangePassword": true,
    "user": {
      "id": 1,
      "username": "admin",
      "nickname": "系统管理员",
      "role": "SUPERADMIN",
      "status": "ENABLED"
    }
  },
  "traceId": "b1f2c3d4e5f6"
}
```

**失败**：`20001` 用户名或密码错误（`401`）；`20002` 账号禁用（`401`）；`20005` 账号锁定（`401`）。

> `mustChangePassword=true` 时前端应强制进入修改密码页。

## 3.2 刷新令牌

`POST /api/v1/auth/refresh` · 🔓

```json
{ "refreshToken": "3f2a9c7e-1b4d-..." }
```

**响应**：同登录的 `data` 结构（不含 `user`，可含）。

失败：`20004` Refresh Token 无效或已吊销。

## 3.3 登出

`POST /api/v1/auth/logout` · 🔑

Header 带 Access Token；请求体可选带 `refreshToken`（若带则同时吊销该 refresh）。

```json
{ "refreshToken": "3f2a9c7e-1b4d-..." }
```

**响应 200**：`{ "code": 0, "message": "success", "data": null }`

## 3.4 当前用户信息

`GET /api/v1/auth/me` · 🔑

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "id": 1,
    "username": "admin",
    "nickname": "系统管理员",
    "email": "admin@example.com",
    "role": "SUPERADMIN",
    "status": "ENABLED",
    "mustChangePassword": false,
    "lastLoginAt": "2026-10-11T09:02:11Z",
    "createdAt": "2026-01-01T00:00:00Z"
  },
  "traceId": "b1f2c3d4e5f6"
}
```

## 3.5 修改本人资料

`PUT /api/v1/auth/me` · 🔑

```json
{ "nickname": "超级管理员", "email": "admin@example.com" }
```

## 3.6 修改本人密码

`PUT /api/v1/auth/me/password` · 🔑

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `oldPassword` | string | ✅ | 原密码 |
| `newPassword` | string | ✅ | 新密码，8–64 位，需含字母与数字 |

```json
{ "oldPassword": "admin@123", "newPassword": "Wenqu@2026" }
```

失败：`20007` 原密码错误。成功后 `mustChangePassword` 置 false，且**吊销该用户全部 refreshToken**。

---

## 3.7 用户列表

`GET /api/v1/users` · 👑

**Query**

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `page` / `size` | int | 1 / 20 | 分页 |
| `keyword` | string | — | 匹配 username / nickname |
| `role` | string | — | `USER` / `ADMIN` / `SUPERADMIN` |
| `status` | string | — | `ENABLED` / `DISABLED` |

**响应 200**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "page": 1, "size": 20, "total": 4, "pages": 1,
    "records": [
      { "id": 1, "username": "admin", "nickname": "系统管理员", "email": null,
        "role": "SUPERADMIN", "status": "ENABLED",
        "lastLoginAt": "2026-10-11T09:02:11Z", "createdAt": "2026-01-01T00:00:00Z" },
      { "id": 2, "username": "ops_manager", "nickname": "运营·王敏", "email": "wm@example.com",
        "role": "ADMIN", "status": "ENABLED",
        "lastLoginAt": "2026-10-10T17:44:02Z", "createdAt": "2026-03-15T08:00:00Z" }
    ]
  },
  "traceId": "b1f2c3d4e5f6"
}
```

## 3.8 创建用户

`POST /api/v1/users` · 👑

| 字段 | 类型 | 必填 | 约束 |
|---|---|---|---|
| `username` | string | ✅ | 4–64，字母数字下划线，唯一 |
| `password` | string | ✅ | 8–64，含字母与数字 |
| `nickname` | string | 否 | ≤64 |
| `email` | string | 否 | 合法邮箱 |
| `role` | string | ✅ | `USER` / `ADMIN` / `SUPERADMIN` |
| `status` | string | 否 | 默认 `ENABLED` |

```json
{ "username": "zhangwei", "password": "Wenqu@2026", "nickname": "张伟",
  "email": "zw@example.com", "role": "USER" }
```

**响应 201**：`data` 为新用户对象（不含密码）。失败：`10003` 用户名已存在。

> 创建 `SUPERADMIN` 仅 `SUPERADMIN` 可操作（与 `role` 参数无关的角色提升保护）。

## 3.9 用户详情 / 编辑 / 删除 / 状态 / 重置密码

| 接口 | 说明 |
|---|---|
| `GET /users/{id}` | 返回单个用户对象 |
| `PUT /users/{id}` | 请求体同创建但无 `password`（`username` 不可改）；`role` 变更需 SUPERADMIN |
| `DELETE /users/{id}` | 物理删除；其创建的知识库/数据源/会话一并删除（FK CASCADE）；`70002` 不可删自己 |
| `PUT /users/{id}/status` | `{ "status": "DISABLED" }`；禁用后该用户所有 refreshToken 吊销 |
| `PUT /users/{id}/password` | `{ "newPassword": "Temp@2026" }`；重置后 `mustChangePassword=true`，返回新密码明文一次 |

## 3.10 用户下拉

`GET /api/v1/users/options` · 🛡️

```json
{ "code": 0, "message": "success",
  "data": [ { "id": 2, "username": "ops_manager", "nickname": "运营·王敏" } ],
  "traceId": "..." }
```

---

# 第四部分 · 模型配置

## 4.1 模型列表

`GET /api/v1/models` · 👑

**Query**：`type`（CHAT/EMBEDDING/RERANK）、`enabled`（bool）

```json
{
  "code": 0, "message": "success",
  "data": [
    { "id": 1, "name": "gpt-4o-mini", "type": "CHAT", "provider": "openai",
      "baseUrl": "https://api.openai.com/v1", "apiKeyMasked": "sk-****abcd",
      "modelName": "gpt-4o-mini", "dimension": null,
      "temperature": 0.70, "maxTokens": 4096, "timeoutMs": 60000,
      "isDefault": true, "enabled": true,
      "extraParams": {}, "createdAt": "2026-10-01T10:00:00Z" },
    { "id": 3, "name": "bge-m3", "type": "EMBEDDING", "provider": "openai",
      "baseUrl": "https://api.openai.com/v1", "apiKeyMasked": "sk-****abcd",
      "modelName": "bge-m3", "dimension": 1024,
      "isDefault": true, "enabled": true, "createdAt": "2026-10-01T10:05:00Z" }
  ],
  "traceId": "..."
}
```

> `apiKey` **永不明文返回**，仅返回掩码。编辑时若不传 `apiKey` 则保留原值。

## 4.2 新增模型

`POST /api/v1/models` · 👑

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | string | ✅ | 展示名，唯一 |
| `type` | string | ✅ | `CHAT` / `EMBEDDING` / `RERANK` |
| `provider` | string | ✅ | `openai` / `dashscope` / `custom` |
| `baseUrl` | string | ✅ | 形如 `https://api.openai.com/v1` |
| `apiKey` | string | ✅ | 明文传入，后端加密存储 |
| `modelName` | string | ✅ | 调用参数中的 model |
| `dimension` | int | EMBEDDING 必填 | 向量维度 |
| `temperature` | number | 否 | 默认 0.7（CHAT） |
| `maxTokens` | int | 否 | 默认 4096（CHAT） |
| `timeoutMs` | int | 否 | 默认 60000 |
| `isDefault` | bool | 否 | 默认 false |
| `enabled` | bool | 否 | 默认 true |
| `extraParams` | object | 否 | 供应商特有参数 |

```json
{
  "name": "qwen-plus", "type": "CHAT", "provider": "dashscope",
  "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "apiKey": "sk-xxxxxxxx", "modelName": "qwen-plus",
  "temperature": 0.5, "maxTokens": 8192, "isDefault": false
}
```

**响应 201**：新模型对象（`apiKeyMasked`）。
失败：`10003` 名称重复；`30004` 该类型已存在默认模型（当 `isDefault=true` 且已有默认）。

## 4.3 编辑 / 删除 / 设为默认

| 接口 | 说明 |
|---|---|
| `PUT /models/{id}` | 字段同新增，均可选；`type` 不允许修改（需删除重建）；`apiKey` 不传则保留 |
| `DELETE /models/{id}` | 若被知识库或会话引用（FK RESTRICT），返回 `10004` 并提示引用数；需先解除引用 |
| `PUT /models/{id}/default` | 置为同类型默认（原默认为 false），请求体可为空 |

## 4.4 连通性测试（已保存）

`POST /api/v1/models/{id}/test` · 👑

**响应 200**

```json
{
  "code": 0, "message": "success",
  "data": {
    "success": true,
    "latencyMs": 842,
    "modelName": "gpt-4o-mini",
    "echo": "pong",
    "detail": "Chat 模型连通正常"
  },
  "traceId": "..."
}
```

失败：`30002`，`data` 含 `error` 明细。

- CHAT：发送 `"ping"`，期望返回文本。
- EMBEDDING：对 `"ping"` 求向量，校验返回维度 == 配置维度，否则 `40006`。
- RERANK：对固定 query + 2 条文档重排，校验可返回分数。

## 4.5 连通性测试（草稿）

`POST /api/v1/models/test` · 👑 · 请求体同新增（无需先保存），便于"先测后用"。

## 4.6 模型下拉

`GET /api/v1/models/options?type=CHAT` · 🔑 · 返回 `{ id, name, type, isDefault }` 数组，仅含 `enabled=true`。

---

# 第五部分 · RAG 知识库

## 5.1 知识库列表

`GET /api/v1/knowledge-bases` · 🔑👤

**Query**：`page`、`size`、`keyword`、`status`（EMPTY/INDEXING/READY）、`ownerId`（🛡️ 时有效）

> `USER` 只能看到 `owner_id = 自己` 的记录；`ADMIN`/`SUPERADMIN` 可见全部。

```json
{
  "code": 0, "message": "success",
  "data": {
    "page": 1, "size": 20, "total": 3, "pages": 1,
    "records": [
      { "id": 1, "name": "产品手册知识库", "description": "产品使用文档、API 说明",
        "embeddingModelId": 3, "embeddingModelName": "bge-m3",
        "rerankEnabled": true, "rerankModelId": 4,
        "retrievalMode": "HYBRID", "topK": 8, "scoreThreshold": 0.35,
        "vectorWeight": 0.6, "bm25Weight": 0.4,
        "ownerId": 1, "ownerName": "admin", "visibility": "PRIVATE",
        "status": "READY", "docCount": 56, "chunkCount": 3014,
        "createdAt": "2026-09-01T08:00:00Z", "updatedAt": "2026-10-11T09:12:00Z" }
    ]
  },
  "traceId": "..."
}
```

## 5.2 创建知识库

`POST /api/v1/knowledge-bases` · 🔑

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | string | ✅ | ≤128，同一归属人下唯一 |
| `description` | string | 否 | ≤512 |
| `embeddingModelId` | long | ✅ | 必须是 EMBEDDING 且维度 == 全局维度，否则 `40006` |
| `rerankModelId` | long | 否 | RERANK 类型；`rerankEnabled=true` 时必填 |
| `chunkSize` | int | 否 | 默认 800 |
| `chunkOverlap` | int | 否 | 默认 120，必须 < chunkSize |
| `separators` | string[] | 否 | 覆盖默认分隔符 |
| `retrievalMode` | string | 否 | `HYBRID`（默认）/ `VECTOR` / `BM25` |
| `vectorWeight` / `bm25Weight` | number | 否 | 仅 HYBRID 使用，和为 1 |
| `rerankEnabled` | bool | 否 | 默认 false |
| `topK` | int | 否 | 默认取系统参数 |
| `scoreThreshold` | number | 否 | 默认取系统参数 |
| `visibility` | string | 否 | 默认 `PRIVATE` |

```json
{ "name": "业务指标口径库", "description": "指标定义与计算口径",
  "embeddingModelId": 3, "retrievalMode": "HYBRID", "rerankEnabled": false }
```

**响应 201**：新知识库对象（`status=EMPTY`）。

## 5.3 详情 / 编辑 / 删除

| 接口 | 说明 |
|---|---|
| `GET /knowledge-bases/{kbId}` | 详见 5.1 `records[0]` 结构 |
| `PUT /knowledge-bases/{kbId}` | 字段同创建均可选。**修改 `embeddingModelId` 或 `chunkSize/overlap/separators` 会使已索引分片失效**，响应 `data` 中返回 `needReindex: true` 提示；不自动重建 |
| `DELETE /knowledge-bases/{kbId}` | 级联删除文档与分片，并删除 MinIO 对象（异步）；`INDEXING` 状态下拒绝，返回 `10004` |

## 5.4 知识库统计

`GET /api/v1/knowledge-bases/{kbId}/stats` · 🔑👤

```json
{
  "code": 0, "message": "success",
  "data": {
    "docCount": 56, "chunkCount": 3014,
    "docStatus": { "READY": 53, "EMBEDDING": 2, "FAILED": 1 },
    "storageBytes": 18432000,
    "lastIndexedAt": "2026-10-11T09:12:00Z",
    "avgChunkTokens": 612
  },
  "traceId": "..."
}
```

## 5.5 检索测试

`POST /api/v1/knowledge-bases/{kbId}/retrieve` · 🔑👤

| 字段 | 类型 | 必填 | 默认 | 说明 |
|---|---|---|---|---|
| `query` | string | ✅ | — | 查询语句 |
| `topK` | int | 否 | 库配置 | 召回条数 |
| `mode` | string | 否 | 库配置 | `HYBRID`/`VECTOR`/`BM25` |
| `scoreThreshold` | number | 否 | 库配置 | 相似度阈值 |
| `vectorWeight` / `bm25Weight` | number | 否 | 库配置 | 覆盖权重 |
| `rerankEnabled` | bool | 否 | 库配置 | 是否重排 |
| `rerankCandidates` | int | 否 | 20 | 重排候选数 |
| `includeExplanation` | bool | 否 | false | 是否返回调试信息 |

```json
{ "query": "如何重置管理员密码？", "topK": 8, "mode": "HYBRID",
  "rerankEnabled": true, "includeExplanation": true }
```

**响应 200**

```json
{
  "code": 0, "message": "success",
  "data": {
    "query": "如何重置管理员密码？",
    "mode": "HYBRID",
    "rerankUsed": true,
    "elapsedMs": 412,
    "timings": { "vectorMs": 63, "bm25Ms": 38, "rerankMs": 210, "totalMs": 412 },
    "references": [
      { "index": 1, "chunkId": 1280, "documentId": 7, "documentName": "产品使用手册 v3.2.pdf",
        "kbId": 1, "chunkIndex": 128, "score": 0.9510,
        "vectorScore": 0.8920, "bm25Score": 18.42,
        "vectorRank": 1, "bm25Rank": 3, "rerankScore": 0.9510,
        "snippet": "管理员密码重置：进入系统管理 → 用户管理 → 选择目标用户 → 重置密码…",
        "metadata": { "section": "3.4 账户安全", "page": 42 } }
    ]
  },
  "traceId": "..."
}
```

> 该接口会写入 `kb_retrieval_log`（`source=TEST`），用于后续检索质量评估。

## 5.6 全库重建索引

`POST /api/v1/knowledge-bases/{kbId}/reindex` · 🔑👤

```json
{ "onlyFailed": false, "resetMode": "REPLACE" }
```

| 字段 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `onlyFailed` | bool | false | 仅重建 FAILED 文档 |
| `resetMode` | string | `REPLACE` | `REPLACE` 先删旧分片；`APPEND` 保留 |

**响应 202**

```json
{ "code": 0, "message": "success",
  "data": { "accepted": true, "documentCount": 56, "kbStatus": "INDEXING" },
  "traceId": "..." }
```

## 5.7 知识库下拉

`GET /api/v1/knowledge-bases/options` · 🔑 · 返回 `{ id, name, status, chunkCount }`，仅 `READY`/`INDEXING` 可被会话引用。

---

# 第六部分 · 文档与分片

## 6.1 文档列表

`GET /api/v1/knowledge-bases/{kbId}/documents` · 🔑👤

**Query**：`page`、`size`、`keyword`（文档名）、`status`

```json
{
  "code": 0, "message": "success",
  "data": {
    "page": 1, "size": 20, "total": 56, "pages": 3,
    "records": [
      { "id": 7, "kbId": 1, "name": "产品使用手册 v3.2.pdf", "fileType": "pdf",
        "fileSize": 4404019, "charCount": 182340, "chunkCount": 481,
        "status": "READY", "progress": 100, "errorMsg": null,
        "createdAt": "2026-10-11T09:10:00Z", "updatedAt": "2026-10-11T09:12:00Z" }
    ]
  },
  "traceId": "..."
}
```

> `progress` 为派生字段：`READY`=100、`FAILED`=0、处理中按已向量化分片占比估算。

## 6.2 上传文档

`POST /api/v1/knowledge-bases/{kbId}/documents` · 🔑👤

- `Content-Type: multipart/form-data`
- 表单字段：`files`（可多个，`multipart/form-data` 数组）

**约束**：单文件 ≤ 50MB；单次 ≤ 20 个；类型白名单 `pdf` `docx` `doc` `md` `markdown` `txt` `html` `htm`。
（扩展名 + MIME + Tika 探测三重校验，任一不符即 `40003`/`40004`。）

**响应 201**（部分成功语义）

```json
{
  "code": 0, "message": "success",
  "data": {
    "accepted": [
      { "documentId": 8, "name": "版本变更记录.md", "status": "PENDING" }
    ],
    "rejected": [
      { "name": "scan.pdf", "code": 40003, "message": "不支持的文件格式" }
    ]
  },
  "traceId": "..."
}
```

> 上传即返回，解析/切分/向量化异步进行；前端轮询 6.3 获取状态。

## 6.3 文档详情（状态轮询）

`GET /api/v1/documents/{docId}` · 🔑👤 · 结构同 6.1 单条记录。
`status` 流转：`PENDING → PARSING → CHUNKING → EMBEDDING → READY`，异常为 `FAILED`（含 `errorMsg`）。

## 6.4 删除文档

`DELETE /api/v1/documents/{docId}` · 🔑👤 · 级联删分片，异步删对象；`200` + `data:null`。

## 6.5 重建 / 重试

| 接口 | 说明 |
|---|---|
| `POST /documents/{docId}/reindex` | 保留文档记录，删除旧分片后重新走流水线；响应 `202` |
| `POST /documents/{docId}/retry` | 仅对 `FAILED` 文档有效，否则 `10004` |

## 6.6 下载文档

`GET /api/v1/documents/{docId}/download` · 🔑👤

```json
{ "code": 0, "message": "success",
  "data": { "url": "https://minio.internal/wenqu/kb/1/doc/2026/10/uuid.pdf?X-Amz-...",
            "expiresIn": 600, "fileName": "产品使用手册 v3.2.pdf" },
  "traceId": "..." }
```

> 返回预签名 URL（10 分钟有效），前端直接跳转/下载，不经过后端流式转发。
> 若前端需要直连 MinIO 域名做 CORS，需在 MinIO 侧配置。

## 6.7 分片列表

`GET /api/v1/documents/{docId}/chunks` · 🔑👤 · Query：`page`、`size`、`keyword`

```json
{
  "code": 0, "message": "success",
  "data": {
    "page": 1, "size": 20, "total": 481, "pages": 25,
    "records": [
      { "id": 1280, "chunkIndex": 128, "tokenCount": 612,
        "content": "管理员密码重置：进入系统管理 → 用户管理…",
        "hasEmbedding": true, "metadata": { "section": "3.4 账户安全", "page": 42 },
        "createdAt": "2026-10-11T09:12:00Z" }
    ]
  },
  "traceId": "..."
}
```

> 列表接口**不返回 embedding 向量**（体积大且无意义）。

## 6.8 分片详情 / 编辑 / 删除

| 接口 | 说明 |
|---|---|
| `GET /chunks/{chunkId}` | 单分片详情（仍不含向量） |
| `PUT /chunks/{chunkId}` | `{ "content": "新的分片文本" }`；成功后**重新计算 tsv 与 embedding**，响应含 `reEmbedded: true` |
| `DELETE /chunks/{chunkId}` | 删除分片并扣减 `kb_knowledge_base.chunk_count` |

---

# 第七部分 · 智能问答（RAG 对话）

## 7.1 会话列表

`GET /api/v1/conversations` · 🔑👤 · Query：`page`、`size`、`keyword`

```json
{
  "code": 0, "message": "success",
  "data": {
    "page": 1, "size": 20, "total": 12, "pages": 1,
    "records": [
      { "id": 88, "title": "如何重置管理员密码？", "kbIds": [1, 2],
        "chatModelId": 1, "chatModelName": "gpt-4o-mini",
        "messageCount": 4, "ownerId": 1,
        "createdAt": "2026-10-11T09:30:00Z", "updatedAt": "2026-10-11T09:32:00Z" }
    ]
  },
  "traceId": "..."
}
```

## 7.2 新建会话

`POST /api/v1/conversations` · 🔑

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 否 | 不传则首条消息自动生成（截断前 20 字） |
| `kbIds` | long[] | 否 | 引用的知识库；为空则纯模型对话（无检索） |
| `chatModelId` | long | 否 | 默认取系统默认 CHAT 模型；无可用模型则 `50004` |

```json
{ "title": "新会话", "kbIds": [1, 2], "chatModelId": 1 }
```

**响应 201**：会话对象。

## 7.3 详情 / 编辑 / 删除

| 接口 | 说明 |
|---|---|
| `GET /conversations/{id}` | 会话对象（含 `kbIds`、`chatModelId`） |
| `PUT /conversations/{id}` | `{ "title": "...", "kbIds": [1], "chatModelId": 2 }` 均可选 |
| `DELETE /conversations/{id}` | 级联删除消息与引用关系 |

## 7.4 消息列表

`GET /api/v1/conversations/{id}/messages` · 🔑👤 · Query：`page`、`size`（默认按 `created_at asc`）

```json
{
  "code": 0, "message": "success",
  "data": {
    "page": 1, "size": 50, "total": 4, "pages": 1,
    "records": [
      { "id": 1023, "role": "USER", "content": "如何重置管理员密码？",
        "createdAt": "2026-10-11T09:30:05Z" },
      { "id": 1024, "role": "ASSISTANT",
        "content": "管理员密码重置流程如下[1]：进入系统管理 → 用户管理…",
        "modelName": "gpt-4o-mini", "promptTokens": 812, "completionTokens": 426,
        "elapsedMs": 2310, "finishReason": "stop", "feedback": null,
        "references": [
          { "index": 1, "chunkId": 1280, "documentId": 7,
            "documentName": "产品使用手册 v3.2.pdf", "kbId": 1,
            "score": 0.9510, "snippet": "管理员密码重置：进入系统管理…" }
        ],
        "createdAt": "2026-10-11T09:30:07Z" }
    ]
  },
  "traceId": "..."
}
```

## 7.5 发送消息（SSE 流式）

`POST /api/v1/conversations/{id}/messages` · 🔑👤⚡

**请求头**：`Accept: text/event-stream`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `content` | string | ✅ | 用户问题，≤4000 字 |
| `stream` | bool | 否 | 默认 true；false 时退化为一次性 JSON 返回 |
| `kbIds` | long[] | 否 | 本次覆盖会话绑定的知识库 |
| `topK` | int | 否 | 本次覆盖召回条数 |
| `rerankEnabled` | bool | 否 | 本次覆盖是否重排 |

```json
{ "content": "如何重置管理员密码？", "stream": true }
```

**响应**：`text/event-stream`，事件序列见 [1.7 SSE 协议](#17-sse-流式协议对话类接口)。
典型顺序：`meta` → `retrieval` → `delta`×N → `usage` → `done`。

**`stream=false` 时**（一次性）：

```json
{
  "code": 0, "message": "success",
  "data": {
    "userMessageId": 1023, "assistantMessageId": 1024,
    "content": "管理员密码重置流程如下[1]：…",
    "modelName": "gpt-4o-mini",
    "promptTokens": 812, "completionTokens": 426, "elapsedMs": 2310,
    "references": [ { "index": 1, "chunkId": 1280, "documentName": "产品使用手册 v3.2.pdf", "score": 0.951 } ]
  },
  "traceId": "..."
}
```

**异常**：模型不可用时以 `event: error` + `code=30003/50004` 返回，HTTP 仍为 200（连接已建立）。
若在建立连接前失败（如会话不存在），返回普通 JSON `404/50001`。

## 7.6 停止生成

`POST /api/v1/conversations/{id}/stop` · 🔑👤

```json
{ "messageId": 1024 }
```

**响应 200**：`data: { "stopped": true }`；服务端中断 SSE 并发送 `done{finishReason:"abort"}`，已生成部分内容落库。

## 7.7 消息反馈

`PUT /api/v1/messages/{messageId}/feedback` · 🔑👤

```json
{ "feedback": "UP" }
```

| 值 | 说明 |
|---|---|
| `UP` | 点赞 |
| `DOWN` | 点踩 |
| `null` | 取消反馈 |

---

# 第八部分 · SQLBot

## 8.1 数据源列表

`GET /api/v1/sqlbot/datasources` · 🔑👤 · Query：`page`、`size`、`keyword`、`status`

```json
{
  "code": 0, "message": "success",
  "data": {
    "page": 1, "size": 20, "total": 2, "pages": 1,
    "records": [
      { "id": 1, "name": "prod-pg-01（生产）", "host": "10.0.1.11", "port": 5432,
        "databaseName": "business", "schemaName": "public", "username": "readonly",
        "sslEnabled": false, "poolSize": 5, "maxRows": 1000, "timeoutMs": 10000,
        "ownerId": 1, "ownerName": "admin", "status": "OK", "enabled": true,
        "lastSyncAt": "2026-10-11T06:00:00Z", "tableCount": 86, "columnCount": 1204,
        "createdAt": "2026-09-01T08:00:00Z" }
    ]
  },
  "traceId": "..."
}
```

> `password` 永不明文返回。
> **注意**：`/sqlbot/datasources` 全系接口仅返回**本人**创建的数据源（`ADMIN` 亦然），只有 `SUPERADMIN` 可见全部。

## 8.2 新增数据源

`POST /api/v1/sqlbot/datasources` · 🔑

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `name` | string | ✅ | 同归属人下唯一 |
| `host` | string | ✅ | 主机/IP |
| `port` | int | 否 | 默认 5432 |
| `databaseName` | string | ✅ | |
| `schemaName` | string | 否 | 默认 `public` |
| `username` | string | ✅ | **建议只读账号** |
| `password` | string | ✅ | 明文传入，加密存储 |
| `sslEnabled` | bool | 否 | 默认 false |
| `poolSize` | int | 否 | 默认 5 |
| `maxRows` | int | 否 | 默认 1000 |
| `timeoutMs` | int | 否 | 默认 10000 |
| `enabled` | bool | 否 | 默认 true |
| `extraParams` | object | 否 | 如 `{"sslmode":"require"}` |

```json
{ "name": "prod-pg-01（生产）", "host": "10.0.1.11", "port": 5432,
  "databaseName": "business", "schemaName": "public",
  "username": "readonly", "password": "******", "poolSize": 5, "maxRows": 1000 }
```

**响应 201**：数据源对象。创建成功但**不自动同步 Schema**，需显式调用 8.6。

## 8.3 详情 / 编辑 / 删除

| 接口 | 说明 |
|---|---|
| `GET /sqlbot/datasources/{id}` | 数据源对象 |
| `PUT /sqlbot/datasources/{id}` | 字段同新增均可选；`password` 不传则保留；修改连接参数后 `status` 置 `UNKNOWN` |
| `DELETE /sqlbot/datasources/{id}` | 级联删除表/字段元数据与会话；返回 `200` |

## 8.4 连接测试（已保存）

`POST /api/v1/sqlbot/datasources/{id}/test` · 🔑👤

```json
{ "code": 0, "message": "success",
  "data": { "success": true, "latencyMs": 47, "serverVersion": "PostgreSQL 16.3",
            "detail": "连接成功，可读取 86 张表" },
  "traceId": "..." }
```

失败：`60002`。

## 8.5 连接测试（草稿）

`POST /api/v1/sqlbot/datasources/test` · 🔑 · 请求体同 8.2（无需先保存）。

## 8.6 触发 Schema 同步

`POST /api/v1/sqlbot/datasources/{id}/sync-schema` · 🔑👤

```json
{ "includeViews": false, "overwriteComments": false }
```

| 字段 | 默认 | 说明 |
|---|---|---|
| `includeViews` | false | 是否一并采集视图 |
| `overwriteComments` | false | 是否用远端注释覆盖本地手工注释 |

**响应 202**

```json
{ "code": 0, "message": "success",
  "data": { "accepted": true, "syncStatus": "RUNNING", "startedAt": "2026-10-11T10:20:00Z" },
  "traceId": "..." }
```

## 8.7 同步状态

`GET /api/v1/sqlbot/datasources/{id}/sync-status` · 🔑👤

```json
{
  "code": 0, "message": "success",
  "data": {
    "syncStatus": "SUCCESS",
    "startedAt": "2026-10-11T10:20:00Z",
    "finishedAt": "2026-10-11T10:20:12Z",
    "tableCount": 86, "columnCount": 1204,
    "errorMsg": null
  },
  "traceId": "..."
}
```

`syncStatus` ∈ `IDLE` / `RUNNING` / `SUCCESS` / `FAILED`。

## 8.8 表列表

`GET /api/v1/sqlbot/datasources/{id}/tables` · 🔑👤 · Query：`page`、`size`、`keyword`、`enabled`

```json
{
  "code": 0, "message": "success",
  "data": {
    "page": 1, "size": 50, "total": 86, "pages": 2,
    "records": [
      { "id": 11, "schemaName": "public", "tableName": "sales_order",
        "tableComment": "销售订单主表", "rowEstimate": 1284920,
        "enabled": true, "columnCount": 12, "syncedAt": "2026-10-11T06:00:00Z" }
    ]
  },
  "traceId": "..."
}
```

## 8.9 表详情（含字段）

`GET /api/v1/sqlbot/datasources/{id}/tables/{tableId}` · 🔑👤

```json
{
  "code": 0, "message": "success",
  "data": {
    "id": 11, "schemaName": "public", "tableName": "sales_order",
    "tableComment": "销售订单主表", "rowEstimate": 1284920, "enabled": true,
    "columns": [
      { "id": 101, "columnName": "order_id", "dataType": "bigint",
        "nullable": false, "isPrimaryKey": true, "columnComment": "订单ID",
        "ordinal": 1, "enabled": true }
    ]
  },
  "traceId": "..."
}
```

## 8.10 更新表配置

`PUT /api/v1/sqlbot/datasources/{id}/tables/{tableId}` · 🔑👤

```json
{ "enabled": false, "tableComment": "（手工）销售订单主表——勿用旧字段 amount" }
```

> 关闭 `enabled` 后该表不进入 NL2SQL 的 Schema 提示词。

## 8.11 样例行

`GET /api/v1/sqlbot/datasources/{id}/tables/{tableId}/sample?limit=10` · 🔑👤

```json
{
  "code": 0, "message": "success",
  "data": {
    "columns": ["order_id", "customer_id", "amount", "status", "created_at"],
    "rows": [
      [100001, 5012, 12800.00, "COMPLETED", "2026-09-03T10:12:00Z"]
    ],
    "rowCount": 10, "limit": 10, "truncated": false
  },
  "traceId": "..."
}
```

失败：`60005`（若表数据敏感，可被系统参数关闭本接口）。

## 8.12 查数会话列表

`GET /api/v1/sqlbot/conversations` · 🔑👤 · Query：`page`、`size`、`datasourceId`、`keyword`

```json
{
  "code": 0, "message": "success",
  "data": {
    "page": 1, "size": 20, "total": 5, "pages": 1,
    "records": [
      { "id": 31, "title": "各区域上月销售额 TOP 榜", "datasourceId": 1,
        "datasourceName": "prod-pg-01（生产）", "kbId": 3, "kbName": "业务指标口径库",
        "messageCount": 6, "ownerId": 1,
        "createdAt": "2026-10-11T10:00:00Z", "updatedAt": "2026-10-11T10:04:00Z" }
    ]
  },
  "traceId": "..."
}
```

## 8.13 新建查数会话

`POST /api/v1/sqlbot/conversations` · 🔑

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `title` | string | 否 | 默认"新查询" |
| `datasourceId` | long | ✅ | 目标数据源，须 `enabled=true` 否则 `60008` |
| `kbId` | long | 否 | 口径参考知识库（可空） |

```json
{ "datasourceId": 1, "kbId": 3 }
```

**响应 201**：查数会话对象。

## 8.14 详情 / 删除 / 消息列表

| 接口 | 说明 |
|---|---|
| `GET /sqlbot/conversations/{id}` | 会话对象 |
| `DELETE /sqlbot/conversations/{id}` | 级联删除消息 |
| `GET /sqlbot/conversations/{id}/messages` | 分页（`page`、`size`） |

消息列表单条结构：

```json
{
  "id": 205, "role": "ASSISTANT",
  "content": "已按 9 月各区域销售额降序取前 5 名。",
  "generatedSql": "SELECT c.region, SUM(o.amount) AS total_amount FROM sales_order o JOIN customer c ON c.id = o.customer_id WHERE o.status = 'COMPLETED' AND o.created_at >= '2026-09-01' AND o.created_at < '2026-10-01' GROUP BY c.region ORDER BY total_amount DESC LIMIT 5",
  "sqlExplanation": "销售额=已完成订单金额合计（口径来自「业务指标口径库」）",
  "sqlStatus": "EXECUTED",
  "resultMeta": {
    "columns": [ { "name": "region", "type": "varchar" },
                 { "name": "total_amount", "type": "numeric" } ],
    "rowCount": 5, "elapsedMs": 68, "truncated": false
  },
  "chartType": "bar",
  "chartOption": { "xAxis": {}, "series": [] },
  "errorMsg": null, "elapsedMs": 3120,
  "createdAt": "2026-10-11T10:04:00Z"
}
```

## 8.15 自然语言查询（SSE 流式）

`POST /api/v1/sqlbot/conversations/{id}/messages` · 🔑👤⚡

**请求头**：`Accept: text/event-stream`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `content` | string | ✅ | 自然语言查询描述 |
| `stream` | bool | 否 | 默认 true |
| `execute` | bool | 否 | 默认 true；false 时只生成 SQL 不执行（供人工确认后再调 8.16） |
| `maxRows` | int | 否 | 覆盖数据源默认上限 |

```json
{ "content": "查一下 9 月份各区域的销售额排名，前 5 名，配上图表", "execute": true }
```

**事件序列**：`meta` → (`reasoning`) → `sql` → (`result` → `chart`) → `done`。
字段定义见 [1.7 SSE 协议](#17-sse-流式协议对话类接口)。

**示例流**

```
event: meta
data: {"conversationId":31,"messageId":205}

event: reasoning
data: {"content":"识别到指标「销售额」与维度「区域」，将关联 sales_order 与 customer。"}

event: sql
data: {"sql":"SELECT c.region, SUM(o.amount) AS total_amount FROM ...","explanation":"销售额=已完成订单金额合计"}

event: result
data: {"columns":[{"name":"region","type":"varchar"},{"name":"total_amount","type":"numeric"}],"rows":[["华东",2224000.00],["华南",1776000.00]],"rowCount":5,"elapsedMs":68,"truncated":false}

event: chart
data: {"type":"bar","option":{"xAxis":{"data":["华东","华南"]},"series":[{"type":"bar","data":[2224000,1776000]}]}}

event: done
data: {"messageId":205}
```

**`execute=false` 时**：仅到 `sql` 事件结束（`sqlStatus=SUGGESTED`），前端展示 SQL 与"执行"按钮。

**错误**：`60005` SQL 安全校验不通过；`60006` 执行超时；`60004` 语法错误；`60002` 数据源连接失败（均以 `event: error` 返回）。

## 8.16 手工执行 SQL

`POST /api/v1/sqlbot/execute` · 🔑

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `datasourceId` | long | ✅ | |
| `sql` | string | ✅ | 只读语句，仍需通过安全校验 |
| `maxRows` | int | 否 | 覆盖默认上限（不得超系统上限） |
| `messageId` | long | 否 | 若是对某条建议 SQL 的执行，回填该消息 ID |

```json
{ "datasourceId": 1, "sql": "SELECT region, COUNT(*) FROM customer GROUP BY region", "maxRows": 100 }
```

**响应 200**

```json
{
  "code": 0, "message": "success",
  "data": {
    "columns": [ { "name": "region", "type": "varchar" },
                 { "name": "count", "type": "int8" } ],
    "rows": [ ["华东", 8213], ["华南", 5090] ],
    "rowCount": 2, "elapsedMs": 34, "truncated": false,
    "chartType": null, "chartOption": null
  },
  "traceId": "..."
}
```

## 8.17 执行计划

`POST /api/v1/sqlbot/explain` · 🔑 · 请求体 `{ datasourceId, sql }`；返回 `data.plan`（EXPLAIN 文本行数组）。

## 8.18 导出

`POST /api/v1/sqlbot/export` · 🔑

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `datasourceId` | long | ✅ | |
| `sql` | string | ✅ | 只读语句 |
| `format` | string | ✅ | `CSV` / `XLSX` |
| `maxRows` | int | 否 | 默认 10 万，超上限 `60007` |
| `fileName` | string | 否 | 导出文件名（不含扩展名） |

**响应**：直接返回文件流

```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename="export_20261011_100422.csv"
```

> CSV 采用 UTF-8 **带 BOM**，避免 Excel 打开乱码。
> 该接口鉴权仍用 Bearer；前端需以 `blob` 方式处理下载（不能用 `<a href>` 直接带 Header），
> 建议流程：`fetch` → `blob` → `URL.createObjectURL` 触发下载。

---

# 第九部分 · 系统管理

## 9.1 系统参数列表

`GET /api/v1/system/settings` · 👑 · Query：`group`（RAG/SQLBot/Security/System）

```json
{
  "code": 0, "message": "success",
  "data": [
    { "key": "rag.retrieval.vector-weight", "value": "0.6", "valueType": "DOUBLE",
      "group": "RAG", "description": "混合检索向量权重",
      "updatedBy": "admin", "updatedAt": "2026-10-11T09:05:00Z" },
    { "key": "sqlbot.max-rows", "value": "1000", "valueType": "INT",
      "group": "SQLBot", "description": "单次查询最大返回行数",
      "updatedBy": "admin", "updatedAt": "2026-10-01T00:00:00Z" }
  ],
  "traceId": "..."
}
```

## 9.2 批量更新参数

`PUT /api/v1/system/settings` · 👑

```json
{
  "items": [
    { "key": "sqlbot.timeout-ms", "value": "10000" },
    { "key": "rag.retrieval.top-k", "value": "10" }
  ]
}
```

**响应 200**：`data: { "updated": 2 }`。非法值 `70001`；每次变更写入操作日志（`type=SYSTEM`）。
> 参数变更**即时生效**（后端内存缓存刷新），无需重启。

## 9.3 操作日志

`GET /api/v1/system/logs` · 👑

**Query**：`page`、`size`、`type`（LOGIN/KB/DOC/CHAT/SQL/SYSTEM）、`userId`、`keyword`、`result`、`startTime`、`endTime`（ISO8601）

```json
{
  "code": 0, "message": "success",
  "data": {
    "page": 1, "size": 20, "total": 1280, "pages": 64,
    "records": [
      { "id": 90211, "userId": 1, "username": "admin", "type": "SQL",
        "action": "NL2SQL 查询 prod-pg-01",
        "target": "conversation:31", "detail": "SELECT c.region… (5 行)",
        "ip": "192.168.3.22", "result": "SUCCESS",
        "traceId": "b1f2c3d4", "createdAt": "2026-10-11T10:04:22Z" }
    ]
  },
  "traceId": "..."
}
```

## 9.4 日志详情 / 导出

| 接口 | 说明 |
|---|---|
| `GET /system/logs/{id}` | 单条详情（`detail` 可为结构化 JSON 字符串） |
| `GET /system/logs/export` | Query 同 9.3，返回 CSV 文件流 |

## 9.5 仪表盘汇总

`GET /api/v1/system/dashboard/stats` · 🛡️

```json
{
  "code": 0, "message": "success",
  "data": {
    "kbCount": 12, "documentCount": 346, "chunkCount": 18204,
    "todayChatCount": 86, "todaySqlCount": 43, "sqlSuccessRate": 0.930,
    "todayPromptTokens": 860000, "todayCompletionTokens": 420000,
    "datasourceCount": 2, "activeUserCount": 7
  },
  "traceId": "..."
}
```

## 9.6 调用量趋势

`GET /api/v1/system/dashboard/usage?days=14` · 🛡️

```json
{
  "code": 0, "message": "success",
  "data": {
    "days": 14,
    "points": [
      { "date": "2026-10-10", "chatCount": 74, "sqlCount": 39, "tokens": 1120000 },
      { "date": "2026-10-11", "chatCount": 86, "sqlCount": 43, "tokens": 1280000 }
    ]
  },
  "traceId": "..."
}
```

## 9.7 依赖组件健康

`GET /api/v1/system/health/components` · 🛡️

```json
{
  "code": 0, "message": "success",
  "data": [
    { "component": "PostgreSQL", "status": "UP", "latencyMs": 3, "detail": "pgvector 0.7.4" },
    { "component": "MinIO", "status": "UP", "latencyMs": 12, "detail": "bucket: wenqu" },
    { "component": "ChatModel:gpt-4o-mini", "status": "UP", "latencyMs": 842, "detail": "默认模型" },
    { "component": "EmbeddingModel:bge-m3", "status": "UP", "latencyMs": 210, "detail": "dim=1024" },
    { "component": "RerankModel:bge-reranker-v2-m3", "status": "UP", "latencyMs": 340, "detail": "精排" },
    { "component": "Redis", "status": "UP", "latencyMs": 1, "detail": "7.2" },
    { "component": "RabbitMQ", "status": "UP", "latencyMs": 6, "detail": "wenqu.ingest 积压 0" },
    { "component": "Datasource:prod-pg-01", "status": "UP", "latencyMs": 47, "detail": "86 表" }
  ],
  "traceId": "..."
}
```

`status` ∈ `UP` / `DOWN` / `DISABLED`。

## 9.8 系统信息

`GET /api/v1/system/info` · 👑

```json
{
  "code": 0, "message": "success",
  "data": {
    "appName": "wenqu-backend", "version": "0.0.1-SNAPSHOT",
    "springBootVersion": "4.1.1", "javaVersion": "17",
    "startedAt": "2026-10-11T08:00:00Z", "uptimeSeconds": 7440
  },
  "traceId": "..."
}
```

---

# 附录 · 前端对接要点

1. **统一封装**：Axios 响应拦截器判断 `code !== 0` 时抛业务错误并 toast；`401/20003` 触发静默刷新或跳登录。
2. **SSE**：用 `fetch` 或 `@microsoft/fetch-event-source`（因 POST + 需带 Header，不能用原生 `EventSource`）。
3. **上传**：`FormData` + `multipart/form-data`，字段名固定为 `files`（数组）。
4. **下载/导出**：`fetch` → `blob` → `URL.createObjectURL`，从 `Content-Disposition` 解析文件名。
5. **状态轮询**：文档列表在存在非终态（`PENDING/PARSING/CHUNKING/EMBEDDING`）时每 3s 轮询一次，终态后停止。
6. **权限渲染**：前端依据 `/auth/me` 的 `role` 控制菜单显隐（仅体验层，**后端必须独立鉴权**）。
7. **时间格式**：所有时间字段为 ISO8601 UTC（`2026-10-11T09:02:11Z`），前端统一格式化。
8. **金额/数字**：`numeric` 类型以 JSON number 返回；超大整数（如 `bigint` 计数）以 number 返回，若担心精度可后续改为 string（见 [`06`](./06-待确认事项.md)）。
9. **命名风格**：请求/响应体统一 **camelCase**；查询参数亦用 camelCase。

---

# 附录 · 变更记录

| 版本 | 日期 | 变更 |
|---|---|---|
| v1 | 2026-10-11 | 初稿，覆盖全部端点与统一约定 |
