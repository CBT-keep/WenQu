package xyz.cbt.wenqu.backend.modules.kb.mapper;

import java.time.OffsetDateTime;

public record ChunkProjection(
        long id, 
        int chunkIndex, 
        int tokenCount, 
        String content,
        boolean hasEmbedding, 
        String metadataJson, 
        OffsetDateTime createdAt) {
}
