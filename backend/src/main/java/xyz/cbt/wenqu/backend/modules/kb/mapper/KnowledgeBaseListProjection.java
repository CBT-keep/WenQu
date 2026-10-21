package xyz.cbt.wenqu.backend.modules.kb.mapper;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * 知识库列表行投影（doc/04 §5.1）
 */
public record KnowledgeBaseListProjection(Long id, String name, String description,
                                          Long embeddingModelId, String embeddingModelName,
                                          Boolean rerankEnabled, Long rerankModelId,
                                          String retrievalMode, Integer topK, BigDecimal scoreThreshold,
                                          BigDecimal vectorWeight, BigDecimal bm25Weight,
                                          Long ownerId, String ownerName, String visibility, String status,
                                          Integer docCount, Integer chunkCount,
                                          OffsetDateTime createdAt, OffsetDateTime updatedAt) {
}
