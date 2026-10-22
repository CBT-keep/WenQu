package xyz.cbt.wenqu.backend.modules.kb.vo;

import xyz.cbt.wenqu.backend.modules.kb.mapper.KnowledgeBaseListProjection;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/**
 * 知识库对象（列表 / 创建 / 详情共用，
 */
public record KnowledgeBaseListVO(Long id, String name, String description,
                                  Long embeddingModelId, String embeddingModelName,
                                  Boolean rerankEnabled, Long rerankModelId,
                                  String retrievalMode, Integer topK, BigDecimal scoreThreshold,
                                  BigDecimal vectorWeight, BigDecimal bm25Weight,
                                  Long ownerId, String ownerName, String visibility, String status,
                                  Integer docCount, Integer chunkCount,
                                  OffsetDateTime createdAt, OffsetDateTime updatedAt) {

    public static KnowledgeBaseListVO from(KnowledgeBaseListProjection row) {
        return new KnowledgeBaseListVO(row.id(), row.name(), row.description(),
                row.embeddingModelId(), row.embeddingModelName(),
                row.rerankEnabled(), row.rerankModelId(),
                row.retrievalMode(), row.topK(), row.scoreThreshold(),
                row.vectorWeight(), row.bm25Weight(),
                row.ownerId(), row.ownerName(), row.visibility(), row.status(),
                row.docCount(), row.chunkCount(),
                row.createdAt(), row.updatedAt());
    }
}
