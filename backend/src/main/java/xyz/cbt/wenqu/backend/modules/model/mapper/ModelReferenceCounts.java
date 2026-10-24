package xyz.cbt.wenqu.backend.modules.model.mapper;

public record ModelReferenceCounts(long knowledgeBaseCount, long conversationCount) {
    public boolean hasReferences() {
        return knowledgeBaseCount > 0 || conversationCount > 0;
    }
}
