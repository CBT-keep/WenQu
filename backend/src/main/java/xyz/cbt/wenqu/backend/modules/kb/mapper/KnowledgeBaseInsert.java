package xyz.cbt.wenqu.backend.modules.kb.mapper;

import java.math.BigDecimal;

public record KnowledgeBaseInsert(
        String name, 
        String description, 
        long embeddingModelId, 
        Long rerankModelId,
        int chunkSize, 
        int chunkOverlap, 
        String separatorsJson, 
        String retrievalMode,
        BigDecimal vectorWeight, 
        BigDecimal bm25Weight, 
        boolean rerankEnabled,
        int topK, 
        BigDecimal scoreThreshold, 
        long ownerId) {
}
