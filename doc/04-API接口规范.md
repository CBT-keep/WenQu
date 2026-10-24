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
| `405` | 请求方法不支持 | `code=10004` |
| `409` | 资源冲突 | `code=10003` |
| `413` | 文件过大 | `code=40004` |
| `500` | 服务端异常 | `code=99999` |

> 约定：能明确对应 HTTP 语义的用状态码；**业务规则类错误**（如"SQL 安全校验不通过"）仍返回 `200` + 非 0 `code`，便于前端统一处理。

## 1.4 分页约定

**请求参数**（仅适用于明确声明分页的接口；数组列表不自动增加分页参数）

| 参数 | 类型 | 默认 | 说明 |
|---|---|---|---|
| `page` | int | `1` | 页码，从 1 开始 |
| `size` | int | `20` | 每页条数，范围 1–100 |
| `sort` | string | 各接口约定 | 仅在具体接口声明支持时接收；限定字段白名单 |
| `order` | string | `desc` | 仅随支持排序的接口接收，限定 `asc` / `desc` |

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

### 查询 DTO 与校验约定

以下为后端实现约定，不代表所有接口已经落地；已有实现与约定的差异需在对应开发任务中处理。

- 多条件列表查询按接口使用独立 DTO，在 Controller 通过 `@ModelAttribute` 绑定 Query 参数、通过 `@Valid` 校验；Service 负责权限与业务规则。GET 请求不改为 JSON 请求体。
- 各 DTO 独立声明自身字段，不合并知识库与文档查询 DTO，也不抽取公共查询父类；复用 `PageResult<T>` 响应不要求复用请求对象。
- 分页 DTO 中 `page` / `size` 默认 `1` / `20`，要求 `page >= 1`、`1 <= size <= 100`；非法值返回参数错误。空数据 `total=0`、`pages=0`，超出末页保留请求页码并返回空 `records`。
- 可选 `keyword` 去除首尾空白，空白按未筛选处理；其他可选文本筛选为空白时不筛选，非空枚举值必须合法。可选 ID 用 `Long`，提供时必须为正数；可选布尔筛选用 `Boolean`，区分未提供与 `false`，非法布尔值返回参数错误。
- 时间筛选使用 `OffsetDateTime`，接收带时区的 ISO8601；提供起止时间时要求 `startTime <= endTime`。参数类型转换失败与 Bean Validation 失败统一返回参数错误。
- `kbId`、`docId`、会话 ID 等路径参数保持独立，由服务端校验其存在性和访问权限。DTO 不承载可信的当前用户或角色；客户端筛选参数不能扩大调用者权限。
- 本文未声明 `sort` / `order` 的接口使用各自固定排序，不接收任意 SQL 字段或排序表达式。

| 接口 | 独立查询 DTO | 字段 |
|---|---|---|
| §3.7 用户列表 | `UserQueryDTO` | `page`、`size`、`keyword`、`role`、`status` |
| §4.1 模型列表 | `ModelQueryDTO` | `type`、`enabled`（不分页） |
| §5.1 知识库列表 | `KnowledgeBaseQueryDTO` | `page`、`size`、`keyword`、`status`、`ownerId` |
| §6.1 文档列表 | `DocumentListQueryDTO` | `page`、`size`、`keyword`、`status` |
| §6.7 分片列表 | `ChunkQueryDTO` | `page`、`size`、`keyword` |
| §7.1 问答会话列表 | `ChatConversationQueryDTO` | `page`、`size`、`keyword` |
| §7.4 问答消息列表 | `ChatMessageQueryDTO` | `page`、`size` |
| §8.1 数据源列表 | `DatasourceQueryDTO` | `page`、`size`、`keyword`、`status` |
| §8.8 数据表列表 | `SqlTableQueryDTO` | `page`、`size`、`keyword`、`enabled` |
| §8.12 查数会话列表 | `SqlConversationQueryDTO` | `page`、`size`、`datasourceId`、`keyword` |
| §8.14 查数消息列表 | `SqlMessageQueryDTO` | `page`、`size` |
| §9.3 操作日志列表 | `OperationLogQueryDTO` | `page`、`size`、`type`、`userId`、`keyword`、`result`、`startTime`、`endTime` |
| §9.4 操作日志导出 | `OperationLogExportQueryDTO` | 与日志列表相同的筛选字段，独立声明，不含 `page` / `size` |

仅含一个简单参数的 options、系统参数分组、样例行和趋势接口可直接接收对应参数，不为形式统一强制增加 DTO。模型及系统参数等返回数组的接口仍保持原响应形式。

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
| | | `40007` | 文件存储操作失败 |
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
> SQL 会话的历史查看/删除遵循会话权限；继续提问、手工执行、EXPLAIN、导出及样例读取必须另外校验数据源权限（包括 ADMIN）。新建会话须校验其数据源和口径库；RAG 会话绑定与每次覆盖 `kbIds` 均逐个校验知识库权限。`messageId` 回填须校验消息所属会话权限及其数据源与请求一致，不能仅凭 ID 修改。

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
| GET | `/documents/{docId}/download` | 🔑👤 | 下载文档（鉴权后流式返回二进制） |
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
| POST | `/conversations/{id}/messages/{messageId}/regenerate` | 🔑👤⚡ | 重新生成最后一条回答 |
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

本人资料更新只接受 `nickname`（最长 64）与 `email`（合法邮箱、最长 128）；缺省或 null 保留旧值，空字符串表示清空。成功返回完整当前用户对象；用户 ID 从认证上下文取得，不能修改角色、状态或其他用户资料。前端入口为侧栏当前用户 → 个人资料，修改密码仍可从该弹窗进入。

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

本接口使用独立 `UserQueryDTO`，字段与校验见 §1.4；`role`、`status` 非空时校验枚举。

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
| `password` | string | 否 | 8–64，含字母与数字；**留空则服务端生成随机初始密码**（明文仅响应一次） |
| `nickname` | string | 否 | ≤64 |
| `email` | string | 否 | 合法邮箱 |
| `role` | string | ✅ | `USER` / `ADMIN`（**超管唯一且不可创建**，传 `SUPERADMIN` 校验失败） |
| `mustChangePassword` | boolean | 否 | 首次登录强制改密。`password` 留空时恒为 `true`（忽略此字段）；指定密码时默认 `false`，可显式传 `true` |
| `status` | string | 否 | 默认 `ENABLED` |

```json
{ "username": "zhangwei", "nickname": "张伟",
  "email": "zw@example.com", "role": "USER" }
```

**响应 201**

```json
{
  "code": 0,
  "message": "success",
  "data": {
    "user": { "id": 2, "username": "zhangwei", "nickname": "张伟", "email": "zw@example.com",
      "role": "USER", "status": "ENABLED", "mustChangePassword": true,
      "lastLoginAt": null, "createdAt": "2026-10-18T09:02:11Z" },
    "tempPassword": "Wqab3km2P74"
  },
  "traceId": "b1f2c3d4e5f6"
}
```

> `tempPassword` 仅在未指定 `password`（随机生成）时非空，**明文只此一次**，前端须弹窗让管理员抄走；指定 `password` 时为 `null`。
> 密码语义：留空 → 随机临时密码 + 首次登录强制改密；指定密码 → 默认无需强制改密（`mustChangePassword=true` 可强制）。
> 失败：`10003` 用户名已存在。**`SUPERADMIN` 不可创建**（超管唯一，由部署种子数据产生）。

## 3.9 用户详情 / 编辑 / 删除 / 状态 / 重置密码

| 接口 | 说明 |
|---|---|
| `GET /users/{id}` | 返回单个用户对象 |
| `PUT /users/{id}` | 请求体同创建但无 `password` / `mustChangePassword`（`username` 不可改）；`role` 仅 `USER` / `ADMIN`，不可晋升 `SUPERADMIN` |
| `DELETE /users/{id}` | 物理删除；仍被知识库/文档/数据源/会话或其他外键引用时返回 `10004`，先清理引用资源；本期不提供资源归属转移；`70002` 不可删自己 |
| `PUT /users/{id}/status` | `{ "status": "DISABLED" }`；禁用后该用户所有 refreshToken 吊销 |
| `PUT /users/{id}/password` | `{ "newPassword": "Temp@2026" }`（可空 → 随机临时密码）；重置后 `mustChangePassword=true`，返回新密码明文一次 |

> **超管自锁保护**（`SUPERADMIN` 对自己的账号）：
> - ✅ 可修改自己的资料；可经 `PUT /auth/me/password` 修改自己的密码（需旧密码）；
> - ❌ 不可禁用自己（`PUT /users/{id}/status` 与 `PUT /users/{id}` 的 `status` 字段均拒绝）；
> - ❌ 不可删除自己（`70002`）；❌ 不可变更自己的角色（不能降级，也不能改）；
> - ❌ 不可重置自己的密码，也不可重置 `SUPERADMIN` 的密码（防一次性新密码未保存导致自锁），改密一律走 `PUT /auth/me/password`。

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

本接口使用独立 `ModelQueryDTO`；`enabled` 使用可空 `Boolean`，`type` 非空时校验枚举，仍返回数组，不分页。

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
| `name` | string | ✅ | 展示名，去除首尾空白后唯一，最多 64 字符 |
| `type` | string | ✅ | `CHAT` / `EMBEDDING` / `RERANK` |
| `provider` | string | ✅ | `openai` / `dashscope` / `custom` |
| `baseUrl` | string | ✅ | 合法 HTTP(S) 基地址，最多 255 字符；不能含 URL 用户凭据、查询参数或片段，形如 `https://api.openai.com/v1` |
| `apiKey` | string | ✅ | 明文传入，后端加密存储 |
| `modelName` | string | ✅ | 调用参数中的 model，最多 128 字符 |
| `dimension` | int | EMBEDDING 必填 | 正整数；本期 EMBEDDING 必须为固定全局维度 1024，与数据库约束一致 |
| `temperature` | number | 否 | 范围 0–2，最多两位小数；默认 0.7（CHAT） |
| `maxTokens` | int | 否 | 正整数；默认 4096（CHAT） |
| `timeoutMs` | int | 否 | 正整数；默认 60000 |
| `isDefault` | bool | 否 | 默认 false |
| `enabled` | bool | 否 | 默认 true |
| `extraParams` | object | 否 | 供应商特有参数，默认 `{}`；不接受数组或标量 |

```json
{
  "name": "qwen-plus", "type": "CHAT", "provider": "dashscope",
  "baseUrl": "https://dashscope.aliyuncs.com/compatible-mode/v1",
  "apiKey": "sk-xxxxxxxx", "modelName": "qwen-plus",
  "temperature": 0.5, "maxTokens": 8192, "isDefault": false
}
```

**响应 201**：新模型对象（`apiKeyMasked`）。
API Key 使用 AES-256-GCM 加密后写入 `api_key_cipher`；密钥配置为 `wenqu.crypto.aes-key`（环境变量 `WENQU_AES_KEY`，32 字节随机密钥的 Base64）。请求参数不写入操作日志；响应仅提供 `apiKeyMasked`，不返回明文或密文。未配置或非法加密密钥属于服务端配置错误，不得降级为明文存储。

失败码与 §1.3 / §1.5 保持一致：

| HTTP | code | 场景 |
|---|---|---|
| `400` | `10001` | 必填字段缺失、非法枚举/URL/字段类型/数值范围，或 EMBEDDING 缺少 dimension |
| `401` | `20003` | 未登录或 Token 无效 |
| `403` | `20006` | 非 SUPERADMIN |
| `409` | `10003` | 名称重复（包括并发创建） |
| `200` | `30004` | `isDefault=true` 且该类型已有默认模型（包括并发创建）；不自动替换原默认模型，禁用的默认模型也计入冲突 |
| `200` | `40006` | EMBEDDING 的正整数 dimension 与固定全局维度 1024 不一致 |
| `500` | `99999` | 加密密钥缺失/非法或其他服务端异常 |

失败时 `data=null`；名称与默认模型同时冲突时优先返回 `10003`。本接口仅保存配置，不发起外部模型调用，不返回连通性测试或调用错误码 `30002/30003`。

## 4.3 编辑 / 删除 / 设为默认

| 接口 | 说明 |
|---|---|
| `PUT /models/{id}` | 字段同新增，均可选；`type` 不允许修改（需删除重建）；`apiKey` 不传则保留 |
| `DELETE /models/{id}` | 若被知识库或会话引用（FK RESTRICT），返回 `10004` 并提示引用数；需先解除引用 |
| `PUT /models/{id}/default` | 将启用的目标模型置为同类型默认，在同一事务内取消原默认；请求体可为空 |

编辑和删除均仅允许 `SUPERADMIN`。编辑成功返回 HTTP 200 + `code=0`，`data` 为完整模型对象；删除成功返回 HTTP 200 + `code=0`、`data=null`。模型列表已返回编辑所需的完整配置，前端直接使用列表项打开编辑弹窗，不提供独立模型详情接口。

- 更新缺省或 null 的普通字段保留原值，显式传入空白字符串返回 `400 / 10001`；非 null 的 `type` 一律拒绝，返回 `400 / 10001`。`extraParams` 提供时必须是对象，传 `{}` 清空，数组/标量/JSON null 均返回 `400 / 10001`。
- `apiKey` 缺省或 null 时保留原密文，不执行解密；提供新值时重新加密。任何响应与操作日志均不包含明文或密文。
- 名称唯一性和默认模型冲突检查排除当前模型；同名返回 `409 / 10003`，同类型默认模型冲突返回 `200 / 30004`。传 `isDefault=false` 可以取消当前默认；编辑不会自动替换其他默认模型。
- 专用 `PUT /models/{id}/default` 仅允许 `SUPERADMIN`，无需请求体，也接受 `{}`。成功返回 `200 / 0`，data 为带 `apiKeyMasked` 的完整目标模型；重复设置当前默认幂等成功。同类型原默认自动取消，其他类型不受影响；不存在或已禁用返回 `200 / 30001`，非法 id 返回 `400 / 10001`，未登录/无权限分别返回 `401 / 20003`、`403 / 20006`。新增默认、编辑默认标记与专用切换共用类型事务锁；切换失败整体回滚，不会单独丢失原默认。
- EMBEDDING 的 dimension 提供时仍须为 1024；正整数但维度不符返回 `200 / 40006`，非正数返回 `400 / 10001`。
- 修改 EMBEDDING 的 `provider/baseUrl/modelName/extraParams` 且值实际变化时，锁定绑定知识库；任一绑定库正在 `INDEXING` 则返回 `200 / 10004`。否则在同一事务中更新模型，并将存在分片的绑定库标记 `index_stale=true`，待重建后恢复。仅改名称、密钥或其他非向量空间参数不新增失效；未变化的配置不触发失效。
- 删除前统计以 embedding/rerank 引用该模型的知识库数量和以 chat 模型引用它的会话数量，若非零则返回 `200 / 10004`，message 提示两类引用数；不级联删除引用资源。行锁与数据库外键共同防止并发创建引用后误删。
- `id` 非正数或类型非法返回 `400 / 10001`；模型不存在返回 `200 / 30001`。未登录、非 SUPERADMIN 分别返回 `401 / 20003`、`403 / 20006`。所有失败响应 `data=null`。

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

失败：`30002`，`data=null`，脱敏错误明细放入 `message`。

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

**后端参数封装**：本接口独立使用 `KnowledgeBaseQueryDTO`，不与文档列表的 `DocumentListQueryDTO` 合并，也不抽取公共查询父类。

| 字段 | 类型 | 默认值 | 说明 |
|---|---|---|---|
| `page` | int | `1` | 从 1 开始 |
| `size` | int | `20` | 每页条数，范围 1–100 |
| `keyword` | String | 无 | 知识库名称搜索；空白按未筛选处理 |
| `status` | String | 无 | `EMPTY` / `INDEXING` / `READY`；空白不筛选，非法值返回参数错误 |
| `ownerId` | Long | 无 | 仅 `ADMIN` / `SUPERADMIN` 可据此筛选；普通用户始终限定为本人，不能通过此参数扩大访问范围 |

分页使用 PageHelper，返回结构继续为 `PageResult<KnowledgeBaseListVO>`（`page`、`size`、`total`、`pages`、`records`）。超过末页时返回空列表，不自动调整至末页。DTO 仅封装查询参数，权限范围由后端确定。

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
| `visibility` | string | 否 | 仅允许 `PRIVATE`；`PUBLIC` 返回 `10001`，本期不开放共享 |

```json
{ "name": "业务指标口径库", "description": "指标定义与计算口径",
  "embeddingModelId": 3, "retrievalMode": "HYBRID", "rerankEnabled": false }
```

**响应 201**：新知识库对象（`status=EMPTY`）。

## 5.3 详情 / 编辑 / 删除

| 接口 | 说明 |
|---|---|
| `GET /knowledge-bases/{kbId}` | 返回 §5.1 单条结构，并必填返回 `chunkSize`、`chunkOverlap`、`separators`，详见下方详情契约 |
| `PUT /knowledge-bases/{kbId}` | 字段同创建均可选；合并旧值后整体校验。索引相关配置实际变化时按下方规则处理；返回完整详情对象及必填 `needReindex`，不自动重建 |
| `DELETE /knowledge-bases/{kbId}` | 级联删除文档与分片，并异步删除本地文件；删除失败由孤儿文件清理任务兜底；`INDEXING` 状态下拒绝，返回 `10004` |

### 5.3.1 详情与更新的完整契约

**前端交互原则**：编辑弹窗默认只展示名称、描述；模型与检索/切分参数收进默认折叠的「高级设置」。分隔符由系统自动采用默认策略，普通用户界面不提供 JSON 编辑；接口保留 separators 供受控配置使用。更新请求仅提交实际变化的字段，隐藏参数保持原值，不能因编辑名称而重置配置。接口支持字段不要求全部直接暴露为表单控件。

详情 `data` = §5.1 的全部字段 + `chunkSize: int`、`chunkOverlap: int`、`separators: string[]`、`needReindex: boolean`。切分配置从数据库读取，以上字段均不可缺省；前端不得用默认值覆盖未知的现有配置。列表可以不包含切分字段。

更新成功为 HTTP 200，`data` = 完整详情对象 + 必填 `needReindex: boolean`。例如（其余详情字段同 GET，实际响应不得省略）：

```ts
type KnowledgeBaseDetail = KnowledgeBaseListItem & {
  chunkSize: number;
  chunkOverlap: number;
  separators: string[];
  needReindex: boolean;
};
type KnowledgeBaseUpdateResult = KnowledgeBaseDetail & { needReindex: boolean };
```

- `ownerId` 只读，由服务端取当前用户；创建/更新传入 `ownerId` 返回 `10001`。本期不支持转移归属。
- PUT 中缺省字段保留旧值；显式 `null` 仅允许清空 `description`、`rerankModelId`，其余非空字段拒绝 null。先合并数据库当前值，再整体校验：`chunkSize > 0`、`0 <= chunkOverlap < chunkSize`、权重各在 `[0,1]` 且和为 1、`topK > 0`、阈值在 `[0,1]`、分隔符为非空字符串数组（允许最后一个元素为空串）、重排开启时必须绑定启用的 RERANK 模型，embedding 必须是启用的 1024 维 EMBEDDING 模型。失败返回 `10001`（维度错误 `40006`）。
- `INDEXING` 时允许修改名称、描述和检索参数；拒绝实际改变 `embeddingModelId/chunkSize/chunkOverlap/separators`，返回 `10004`。任务领取与配置更新共用知识库行锁，避免检查后状态变化。
- `needReindex` 表示当前已有分片与配置不一致，GET 详情也必填返回该字段。只有 `embeddingModelId/chunkSize/chunkOverlap/separators` 的实际值变化使现有分片失效；未改变值或仅改名称、描述、检索参数不新增失效。已处于失效状态时继续返回 true；没有分片时为 false。
- 同维度不代表同向量空间：允许修改 embedding 模型，但有旧分片时必须原子标记 `index_stale=true`；失效库的检索、RAG 和口径检索均返回 `10004`，直到全部现存文档按新配置成功重建。修改同一模型记录的 `modelName/baseUrl/extraParams` 也应使其绑定库失效；被 INDEXING 库引用时拒绝此类修改。仅轮换 API Key 不使索引失效。
- 重建运行状态仍使用 EMPTY/INDEXING/READY；`index_stale` 独立持久化，重建失败不能清除。失效时拒绝 `onlyFailed=true`，避免只重建部分文档就恢复服务。非失效库修改配置后是否主动重建由用户决定。

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
| `scoreThreshold` | number | 否 | 库配置 | 仅作用于向量支路余弦相似度；BM25 模式忽略，不过滤 RRF 或重排分数 |
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
| `resetMode` | string | `REPLACE` | 仅允许 `REPLACE`，先删旧分片；`APPEND` 返回 `10001`，避免重复分片及序号冲突 |

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

本接口使用独立 `DocumentListQueryDTO`（不继承公共查询父类）。分页与参数校验见 §1.4；`status` 仅允许 `PENDING` / `PARSING` / `CHUNKING` / `EMBEDDING` / `READY` / `FAILED`，路径 `kbId` 单独进行知识库访问校验。

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

`DELETE /api/v1/documents/{docId}` · 🔑👤 · 运行中文档拒绝删除（`10004`）；其余级联删分片，提交后异步删本地文件；`200` + `data:null`。

## 6.5 重建 / 重试

| 接口 | 说明 |
|---|---|
| `POST /documents/{docId}/reindex` | 保留文档记录，删除旧分片后重新走流水线；响应 `202` |
| `POST /documents/{docId}/retry` | 仅对 `FAILED` 文档有效，否则 `10004` |

## 6.6 下载文档

`GET /api/v1/documents/{docId}/download` · 🔑👤

**直接返回文件二进制流**，不返回 URL。

| 响应头 | 值 |
|---|---|
| `Content-Type` | 文档原始 MIME（如 `application/pdf`） |
| `Content-Disposition` | `attachment; filename*=UTF-8''<urlencoded 原始文件名>` |
| `Content-Length` | 文件字节数 |

错误：HTTP `404` + `10002` 文档不存在或文件已丢失；HTTP `403` + `20006` 无权限。ADMIN / SUPERADMIN 可访问全部文档。

> **为什么不再返回预签名 URL**：MinIO 已废弃，本地文件存储无法生成可公开访问的外链。
> 改为后端鉴权后流式返回，反而更安全 —— 预签名 URL 任何人拿到都能下载、绕过了归属校验，
> 而现在 `ResourceGuard.checkOwner()` 对每次下载生效。
> 前端需以 `blob` 方式处理，见文末「附录 · 前端对接要点」第 4 条。

## 6.7 分片列表

本接口使用独立 `ChunkQueryDTO`；分页与参数校验见 §1.4，路径 `docId` 单独校验文档访问权限。

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

本接口使用独立 `ChatConversationQueryDTO`，分页与参数校验见 §1.4。

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

本接口使用独立 `ChatMessageQueryDTO`，分页参数校验见 §1.4；路径会话 ID 单独进行访问校验，按 `created_at ASC, id ASC` 稳定排序。

`GET /api/v1/conversations/{id}/messages` · 🔑👤 · Query：`page`、`size`（默认按 `created_at ASC, id ASC`）

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

### 7.6.1 重新生成

`POST /api/v1/conversations/{id}/messages/{messageId}/regenerate` · 🔑👤⚡。仅允许重新生成会话最后一条 assistant 回答，且无运行中生成任务，否则 `10004`。复用原 user 问题、不新增 user 消息；创建新的 assistant 消息并保留原回答，返回与 §7.5 相同 SSE。新消息保存 `regenerates_message_id`；后续上下文只采用该问题最新一次成功回答，失败或中止不替换原回答。调用时重新校验模型、知识库和索引有效性。

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

本接口使用独立 `DatasourceQueryDTO`；分页与参数校验见 §1.4，`status` 为 `OK` / `ERROR` / `UNKNOWN`。`ADMIN` / `USER` 始终限定本人数据源，`SUPERADMIN` 可查看全部。

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

本接口使用独立 `SqlTableQueryDTO`，分页参数校验见 §1.4；`enabled` 使用可空 `Boolean`，路径数据源 ID 按数据源权限规则校验。

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

> 关闭 `enabled` 后该表不进入 NL2SQL 的 Schema 提示词。字段级 enabled 目前只读，本期通过表级开关控制；没有字段更新接口时前端不得展示可操作的字段开关。

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

本接口使用独立 `SqlConversationQueryDTO`，分页参数校验见 §1.4；可选 `datasourceId` 使用 `Long` 且提供时须为正数，筛选不改变调用者的会话访问范围。

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
| `GET /sqlbot/conversations/{id}/messages` | 独立 `SqlMessageQueryDTO`，分页（`page`、`size`），校验见 §1.4 |

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

> 历史表格使用消息 `resultRows`（二维数组）恢复，最多保存执行时实际返回的截断结果；不自动重跑 SQL。`resultMeta` 保存列信息、条数与截断标记，`resultRows=null` 表示未执行或结果已按保留策略清理。导出接口会重新执行 SQL，结果可能与历史不同，前端须明确提示。

## 8.15 自然语言查询（SSE 流式）

`POST /api/v1/sqlbot/conversations/{id}/messages` · 🔑👤⚡

**请求头**：`Accept: text/event-stream`

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `content` | string | ✅ | 自然语言查询描述 |
| `stream` | bool | 否 | 默认 true |
| `execute` | bool | 否 | 默认 true；false 时只生成 SQL 不执行（供人工确认后再调 8.16） |
| `maxRows` | int | 否 | 覆盖数据源默认值，必须为正且不超过系统 `sqlbot.max-rows` 上限 |

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

**`execute=false` 时**：发送 `meta` →（可选 `reasoning`）→ `sql` → `done`（`sqlStatus=SUGGESTED`），前端展示 SQL 与"执行"按钮。

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
> 生效范围见下表；参数更新需原子校验关联项，失败时整批回滚，不得接受未知 key。

| 参数 | 生效范围 |
|---|---|
| `rag.retrieval.vector-weight/bm25-weight/top-k/score-threshold`、`rag.chunk.*` | 创建知识库时的默认值；不覆盖已有库配置，已有库通过 §5.3 更新 |
| `rag.retrieval.rerank-candidates`、上传限制、SQL 执行限制、登录限流、日志保留 | 提交后对新请求/任务生效；运行中任务使用启动时快照；SQL 系统限制为硬上限 |
| `sqlbot.pool-size` | 新建或重建连接池时生效，现有连接池平滑回收 |
| `jwt.*` | 新签发令牌生效，已有令牌不因 TTL 调整而延长或缩短 |
| `rag.embedding.dimension` | 只读固定 1024，更新返回 `70001`；调整须新迁移、重建向量和索引 |

## 9.3 操作日志

本接口使用独立 `OperationLogQueryDTO`，分页与时间区间校验见 §1.4；`result` 为 `SUCCESS` / `FAILURE`，`type` 按下列枚举校验。

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
| `GET /system/logs/export` | 独立 `OperationLogExportQueryDTO`，筛选字段同 9.3，不接收分页参数，返回完整匹配结果的 CSV 文件流 |

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
    { "component": "LocalStorage", "status": "UP", "latencyMs": 1, "detail": "可用 42.3GB / 共 512GB（.wenqu-data/storage）" },
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
| v3 | 2026-10-22 | 审查修订：知识库完整详情/更新、索引失效、权限隔离、删除、评分、SSE 与参数生效契约；新增行为待实现 |
| v2 | 2026-10-13 | 文件存储由 MinIO 改为本地文件系统：§6.6 下载接口改为后端鉴权流式返回（不再返回预签名 URL）；§5.3 删除知识库改为异步删本地文件；§9.7 健康组件 `MinIO` 改为 `LocalStorage` |
