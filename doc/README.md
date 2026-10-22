# WenQu · 项目文档索引

> 版本：v0.3
> 日期：2026-10-22
> 说明：本目录为设计阶段产物，包含需求、架构、数据库、API 规范、开发指引与 HTML 原型图。
> **已确认决策与默认假设见 [`06-待确认事项.md`](./06-待确认事项.md)；2026-10-22 审查修订属于设计契约，尚未全部实现。**
>
> **2026-10-22 审查修订**：统一知识库详情与编辑契约、索引失效规则、权限与删除规则、检索评分及任务可靠性。接口以 `04` 为准；现有迁移事实以 `03` §0 为准，新增设计不代表代码已实现。
>
> **v0.2 变更**：文件存储 MinIO → 本地文件系统；中文分词 zhparser → 应用层 Lucene；
> 环境精简为 3 个 Docker 容器（移除 MinIO、移除需编译的 PG 扩展），并补充国内网络加速配置。
> 详见各文档内的说明。

---

## 一、项目定位

**WenQu** 是一个「RAG 知识库」与「SQLBot 自然语言查数」相结合的前后端分离平台。
用户既可以对上传的文档进行检索问答（RAG），也可以用自然语言直接查询业务数据库（NL2SQL），
并让 NL2SQL 引用知识库中的**指标口径**，从而让"查数"更准确。

- 前端：React + TypeScript + shadcn/ui + Tailwind CSS
- 后端（重点）：Spring Boot 4.1.1 + Maven + MyBatis + PostgreSQL(pgvector) + LangChain4j + OpenAI 兼容协议 + Spring Security
- 基础设施：PostgreSQL 16(+pgvector)、Redis、RabbitMQ、OpenAI 兼容大模型服务
  （文件存储为本地磁盘，**不使用 MinIO / 对象存储**）

---

## 二、文档清单

| 编号 | 文件 | 内容 | 目标读者 |
|---|---|---|---|
| 01 | [需求与范围说明](./01-需求与范围说明.md) | 角色、功能范围、用户故事、边界与非目标 | 产品 / 全员 |
| 02 | [技术架构设计](./02-技术架构设计.md) | 分层架构、模块划分、关键时序、技术选型与风险 | 后端 / 架构 |
| 03 | [数据库设计](./03-数据库设计.md) | ER 关系、完整 DDL、pgvector 索引、本地文件存储布局 | 后端 |
| 04 | [API 接口规范](./04-API接口规范.md) | 全局约定 + **全部端点定义**（请求/响应示例、错误码） | 前端 / 后端 |
| 05 | [开发文档](./05-开发文档.md) | 构建运行、目录结构、编码规范、任务拆分、镜像配置原理 | 开发者 |
| **07** | **[环境搭建指南](./07-环境搭建指南.md)** | **新协作者从零装机手册**：分平台安装、三步配镜像、验收清单、常见报错 | **新人必读** |
| 06 | [待确认事项](./06-待确认事项.md) | 所有我做了默认假设、需要你拍板的点 | 需求方 |
| 08 | [认证与用户管理待办事项](./08-认证与用户管理待办事项.md) | 代码审查发现、修复优先级、验收标准与回归测试 | 后端 |
| — | [HTML 原型图](./prototype/wenqu-prototype.html) | 单文件 **11 页**原型，Codex 式布局（侧栏以会话为主 + 输入框左下角模式切换），视觉对齐 Yuxi/SQLBot，含「设计规范」页固化色板与组件 | 全员 |

---

## 三、已确认的关键决策（速查）

| 决策项 | 结论 |
|---|---|
| 向量存储 | PostgreSQL + **pgvector**（不引入独立向量库） |
| 认证方式 | **JWT 无状态**；**不开放自助注册**，账号由管理员创建 |
| 功能模块 | RAG 知识库管理、智能问答对话、SQLBot 自然语言查询、系统管理（全覆盖） |
| SQLBot 数据源 | **仅 PostgreSQL**（预留多数据源扩展点） |
| 文件存储 | **本地文件系统**（`StorageService` 接口抽象，`s3` 实现预留）。~~MinIO~~ 已废弃 |
| 大模型 | **多模型可配置**（CHAT / EMBEDDING / RERANK），对话走 **SSE 流式** |
| 模型接入 | LangChain4j **官方支持 Spring Boot 4**；不使用其 Starter，只用核心 + provider 模块 |
| 模型部署 | bge-m3（**1024 维**）/ bge-reranker-v2-m3 **全部云上调用**；全局维度统一 1024 |
| 中间件 | **Redis**（令牌吊销 / 登录限流 / 配置缓存）+ **RabbitMQ**（文档摄入 / Schema 同步队列） |
| 中文分词 | **应用层 Lucene `smartcn`** + PG 内置 `simple` 配置。~~zhparser~~ 已废弃（需编译且 Windows 不可用） |
| API 风格 | 路径前缀 `/api/v1` + **统一响应体** `{code,message,data}` |
| 检索策略 | **混合检索**（bge-m3 向量召回 + Lucene 中文分词 + PostgreSQL 全文检索，RRF 融合）→ **bge-reranker-v2-m3 精排** |
| 文档解析 | PDF / DOCX / MD / TXT / HTML，统一用 **Apache Tika** |
| 环境搭建 | 3 个 Docker 容器（postgres / redis / rabbitmq）；Maven、npm、Docker 均已配国内镜像。**新人从零装机见 [07-环境搭建指南](./07-环境搭建指南.md)** |
| SQLBot 输出 | 结果**表格 + 图表（ECharts）+ CSV/Excel 导出** |
| 权限模型 | 三层角色：**USER / ADMIN / SUPERADMIN**；ADMIN 管全平台 RAG，但**数据源仅本人**（SUPERADMIN 全可见） |
| 原型形式 | 单文件多页面 HTML（CDN Tailwind + Lucide 图标） |
| 视觉基准 | **参考 Yuxi**（`/Users/hbk/Develop/Yuxi/web`，青蓝 `#24839b`）与 **SQLBot**（`/Users/hbk/Develop/SQLBot/frontend`，薄荷绿 `#1cba90`）；布局为 Codex 式。详见 [05 开发文档 §4.1/§4.2](./05-开发文档.md) |

---

## 四、如何阅读

1. **新同学第一步**：按 [`07-环境搭建指南.md`](./07-环境搭建指南.md) 把机器准备好（约 40 分钟）。
2. **需求方** 看 `06-待确认事项.md`，把待定项确认掉（其中几项会影响数据结构，越早定越好）。
3. **前端同学** 重点看 `04-API接口规范.md` 与原型图。
4. **后端同学** 按 `02 → 03 → 04 → 05` 顺序阅读。
5. 原型图双击即可用浏览器打开（需联网加载 Tailwind CDN）。

## 五、环境搭建速查

> **新机器请直接看 [07-环境搭建指南](./07-环境搭建指南.md)**（含分平台安装步骤、验收清单、常见报错排错）。
> 下面是"机器已就绪"情况下的速查，约 5 分钟：

```bash
# 1. 起基础设施（postgres / redis / rabbitmq）
docker compose up -d && docker compose ps      # 等三个服务 healthy

# 2. 建文件存储目录
mkdir -p .wenqu-data/storage

# 3. 起后端（Flyway 自动建表）
cd backend && mvn spring-boot:run
```

**首次装机才需要做的三件事**（各做一次即可）：

| 事项 | 命令 / 位置 |
|---|---|
| Maven 镜像 | `cp scripts/maven-settings.xml ~/.m2/settings.xml` |
| npm 镜像 | **无需操作** —— 根目录 `.npmrc` 已内置 `registry.npmmirror.com`，clone 后自动生效 |
| Docker 加速 | Docker Desktop → Settings → Docker Engine，粘贴 [07 §2 ③](./07-环境搭建指南.md) 的 `registry-mirrors` JSON |

Windows 装 Docker 还需管理员跑一次 `.\scripts\setup-windows.ps1` 并重启（启用 WSL2）。

---

## 六、命名约定

- 项目英文名：`wenqu`；Maven groupId：`xyz.cbt.wenqu`
- 后端包根：`xyz.cbt.wenqu.backend`
- 数据库对象前缀：`sys_`（系统）、`kb_`（知识库）、`chat_`（对话）、`sql_`（SQLBot）
- 前端路由与后端资源路径保持一一对应（见 `04`）
