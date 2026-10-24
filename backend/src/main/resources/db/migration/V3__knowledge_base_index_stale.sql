-- 向量模型调用配置变化后，持久化绑定知识库的索引失效状态。
ALTER TABLE kb_knowledge_base ADD COLUMN index_stale boolean NOT NULL DEFAULT false;

-- 模型删除前按反向引用查询，避免扫描全部知识库或会话。
CREATE INDEX idx_kb_embedding_model ON kb_knowledge_base(embedding_model_id);
CREATE INDEX idx_kb_rerank_model ON kb_knowledge_base(rerank_model_id);
CREATE INDEX idx_chat_conv_model ON chat_conversation(chat_model_id);
