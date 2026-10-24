package xyz.cbt.wenqu.backend.modules.kb.mapper;

import java.time.OffsetDateTime;

public record KnowledgeBaseStatsProjection(
        long docCount, 
        long chunkCount, 
        long storageBytes,
        OffsetDateTime lastIndexedAt, 
        double avgChunkTokens, 
        String docStatusJson) {
}
