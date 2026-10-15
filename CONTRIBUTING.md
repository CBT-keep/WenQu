# 协作开发规范（WenQu）

> 一句话原则：**`main` 分支永远可运行，任何人都不直接往 `main` 推代码，所有改动走 Pull Request。**

---

## 1. 分支模型

| 分支 | 用途 | 谁可以合并 |
| --- | --- | --- |
| `main` | 主干，始终可部署 | 仅通过 PR，需审查 + CI 绿 |
| `feature/xxx` | 新功能 | 作者自己开，PR 合并后删除 |
| `fix/xxx` | 缺陷修复 | 同上 |
| `refactor/xxx` | 重构、技术债 | 同上 |
| `docs/xxx` | 文档 | 同上 |
| `chore/xxx` | 依赖、构建、配置 | 同上 |

命名用小写英文 + 连字符，带上 Issue 号更方便追溯，例如 `feature/42-login-page`。

## 2. 标准开发流程

```bash
# 1. 先同步主干，永远基于最新的 main 开分支
git checkout main
git pull origin main

# 2. 开功能分支
git checkout -b feature/42-login-page

# 3. 小步提交（见第 3 节提交规范）
git add -p
git commit -m "feat(auth): 增加登录页表单校验"

# 4. 推送并发 PR
git push -u origin feature/42-login-page
#    然后到 GitHub 开 PR，base 选 main

# 5. 审查通过、CI 全绿后合并（推荐 Squash and merge）

# 6. 清理
git checkout main && git pull origin main
git branch -d feature/42-login-page
```

## 3. 提交信息规范（Conventional Commits）

格式：`<type>(<scope>): <subject>`

| type | 含义 |
| --- | --- |
| `feat` | 新功能 |
| `fix` | 修复缺陷 |
| `refactor` | 重构（不改外部行为） |
| `perf` | 性能优化 |
| `docs` | 文档 |
| `test` | 测试 |
| `ci` | CI / 构建配置 |
| `chore` | 依赖升级、杂项 |

示例：
```
feat(frontend): 新增文库列表页分页
fix(backend): 修复书籍详情接口 NPE
chore(deps): 升级 spring-boot 到 4.1.1
```

## 4. PR 要求

- 一个 PR 只做一件事，控制在 400 行改动以内，超了就拆。
- 必须填 PR 模板里的自检清单。
- 至少 **1 个** CODEOWNER 的 Approve。
- CI 的 `backend` 和 `frontend` 两个 job **必须全绿**。
- 所有 review 评论（conversation）必须标记为已解决。
- 合并方式默认 **Squash and merge**，保持 `main` 历史线性干净。
- 合并后自动删除源分支。

## 5. 审查者指南（Reviewer）

### 5.1 先看哪里

PR 页面四个 tab，按顺序过：

| Tab | 看什么 | 判据 |
| --- | --- | --- |
| **Conversation** | PR 描述、自检清单、关联 Issue | 说不清"为什么改"的，先让作者补描述 |
| **Checks** | `backend` / `frontend` 两个 CI job | 红了直接打回，不用往下看；点了 Details 看是哪一步挂的 |
| **Commits** | 提交拆分是否合理 | 一堆 `fix`、`update`、临时提交 → 要求 squash 整理 |
| **Files changed** | 真正的代码 | 见 5.3 |

### 5.2 三种结论怎么选

| 结论 | 什么时候用 | 后果 |
| --- | --- | --- |
| **Approve** | 逻辑正确、CI 绿、评论都解决了 | 满足合并门禁，作者可以自行合并 |
| **Request changes** | 有必须改的问题 | **阻断合并**，作者改完推送后需你重新 Approve |
| **Comment** | 只是建议、不影响正确性 | 不阻断，作者可自行决定改不改 |

操作：`Files changed` 右上角绿色 **Review changes** 按钮 → 写总结 → 选一项 → Submit review。
在某一行点 `+` 可以直接留**行内评论**；点行号旁边的 `±` 图标能给出**可直接采纳的修改建议**（Suggestion），作者一键 Apply，省一趟往返。

### 5.3 审代码的顺序（先看大面，再看细节）

1. **范围**：这个 PR 是不是只做了一件事？混进无关改动就要求拆。
2. **方向**：实现思路对不对、有没有更简单的做法、有没有重复造轮子。
3. **接口与数据**：后端改了接口字段/返回体，前端是否同步？`docker-compose.yml`、文档是否同步？
4. **正确性**：边界条件、空值、异常捕获、并发、事务边界。
5. **安全**：有没有硬编码密钥、SQL 拼接、越权（本项目用了 Spring Security，注意接口鉴权注解）。
6. **风格**：命名、重复代码、无用注释——这类用 Comment 提，别用 Request changes。

### 5.4 本地拉下来验证（UI / 接口改动必做）

装好 GitHub CLI 后一条命令即可：

```bash
scoop install gh          # 首次安装
gh auth login             # 首次登录
gh pr checkout 42         # 42 换成 PR 号，自动切到对方的分支
```

然后按改动范围验证：

```bash
# 后端改动
cd backend && ./mvnw -B -ntp verify

# 前端改动
cd frontend && pnpm install --frozen-lockfile && pnpm lint && pnpm build && pnpm dev
```

不想装 CLI 也能拉：
```bash
git fetch origin pull/42/head:pr-42 && git checkout pr-42
```

### 5.5 合并

- 满足「1 个 Approve + CI 全绿 + conversation 全解决」后，用 **Squash and merge**。
- 合并前把标题整理成 Conventional Commits 格式（如 `feat(frontend): 新增文库列表分页`），它会成为 `main` 上的提交信息。
- 合并后源分支会被自动删除。
- 合并完顺手确认一下 `main` 的 CI 是不是还绿。

### 5.6 审查的规矩

- 24 小时内给第一次响应，别让人干等。
- 评论说清「问题 + 为什么 + 建议怎么改」，别只写"这样不好"。
- 区分必须改和可商榷：必须改的放 Request changes，建议性的标注 `nit:` 前缀。
- 作者回复后回来 **Resolve conversation**，否则门禁过不了。

## 6. 禁止事项

- ❌ `git push --force` 到 `main`（已被服务端禁止）
- ❌ 在 GitHub 网页端直接编辑 `main` 上的文件
- ❌ 提交密钥、口令、数据库地址等敏感信息（用 `.env` + `.gitignore`）
- ❌ 提交 `node_modules/`、`target/`、`dist/`、本地数据目录
- ❌ 把未通过 CI 的 PR 用"管理员权限"强行合并
- ❌ 自己开的 PR 自己 Approve 合并（至少 1 个人审）

## 7. 环境与依赖

- 后端：JDK 17 + Maven Wrapper（`./mvnw`），不要用自己的全局 mvn 版本跑构建
- 前端：Node 22 + pnpm 9，提交前务必 `pnpm lint && pnpm build`
- 新增环境变量要同步更新 `docker-compose.yml` 和 `doc/` 下的部署文档
