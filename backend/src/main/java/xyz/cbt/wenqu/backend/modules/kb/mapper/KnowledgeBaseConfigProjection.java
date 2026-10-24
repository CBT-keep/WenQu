package xyz.cbt.wenqu.backend.modules.kb.mapper;

public record KnowledgeBaseConfigProjection(
        int chunkSize, 
        int chunkOverlap, 
        String separatorsJson,
        boolean indexStale, 
        boolean hasChunks) {
}
