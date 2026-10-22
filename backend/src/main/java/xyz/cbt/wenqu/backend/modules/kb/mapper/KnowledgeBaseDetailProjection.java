package xyz.cbt.wenqu.backend.modules.kb.mapper;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * 知识库详情投影：在知识库本体之外联出 embedding 模型名与归属人用户名，
 * 供编辑表单回填与列表展示，避免前端二次请求。
 */
public record KnowledgeBaseDetailProjection(
        Long id,
        String name,
        String description,
        Long embeddingModelId,
        String embeddingModelName,
        Long rerankModelId,
        Boolean rerankEnabled,
        String retrievalMode,
        Integer topK,
        BigDecimal scoreThreshold,
        BigDecimal vectorWeight,
        BigDecimal bm25Weight,
        Integer chunkSize,
        Integer chunkOverlap,
        Long ownerId,
        String ownerName,
        String visibility,
        String status,
        Integer docCount,
        Integer chunkCount,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt) {
}
