package xyz.cbt.wenqu.backend.modules.kb.vo;

import xyz.cbt.wenqu.backend.modules.kb.mapper.KnowledgeBaseListProjection;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

public record KnowledgeBaseDetailVO(
        Long id, 
        String name, 
        String description,
        Long embeddingModelId, 
        String embeddingModelName,
        Boolean rerankEnabled, 
        Long rerankModelId, 
        String retrievalMode,
        Integer topK, 
        BigDecimal scoreThreshold, 
        BigDecimal vectorWeight, 
        BigDecimal bm25Weight,
        Long ownerId, 
        String ownerName, 
        String visibility, 
        String status,
        Integer docCount, 
        Integer chunkCount, 
        OffsetDateTime createdAt, 
        OffsetDateTime updatedAt,
        int chunkSize, 
        int chunkOverlap, 
        java.util.List<String> separators, 
        boolean needReindex) {
            
    public static KnowledgeBaseDetailVO from(KnowledgeBaseListProjection row, int chunkSize, int chunkOverlap,
            java.util.List<String> separators, boolean needReindex) {
        return new KnowledgeBaseDetailVO(row.id(), row.name(), row.description(), row.embeddingModelId(),
                row.embeddingModelName(), row.rerankEnabled(), row.rerankModelId(), row.retrievalMode(),
                row.topK(), row.scoreThreshold(), row.vectorWeight(), row.bm25Weight(), row.ownerId(),
                row.ownerName(), row.visibility(), row.status(), row.docCount(), row.chunkCount(),
                row.createdAt(), row.updatedAt(), chunkSize, chunkOverlap, separators, needReindex);
    }
}
