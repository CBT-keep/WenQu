-- 容器首次初始化时自动执行（挂载到 /docker-entrypoint-initdb.d）。
--
-- 本项目的 PostgreSQL 只需要 vector 一个扩展：
--   - 向量检索      → pgvector（镜像已内置）
--   - 中文 BM25     → 应用层 Lucene 分词 + PG 内置的 simple 文本搜索配置，
--                     不需要 zhparser / pg_jieba 等需要编译的扩展
--                     （见 doc/03-数据库设计.md §4.5）
--
-- 表结构由后端 Flyway 迁移（V1__init.sql）负责，不在此处创建。

CREATE EXTENSION IF NOT EXISTS vector;

-- 验证：SELECT extversion FROM pg_extension WHERE extname = 'vector';
