package xyz.cbt.wenqu.backend.modules.kb.vo;

import tools.jackson.databind.JsonNode;
import java.time.OffsetDateTime;

public record ChunkVO(
        long id, 
        int chunkIndex, 
        int tokenCount, 
        String content,
        boolean hasEmbedding, 
        JsonNode metadata, 
        OffsetDateTime createdAt) {
}
