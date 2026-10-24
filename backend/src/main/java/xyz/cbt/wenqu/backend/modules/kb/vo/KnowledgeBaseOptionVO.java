package xyz.cbt.wenqu.backend.modules.kb.vo;

public record KnowledgeBaseOptionVO(
    Long id, 
    String name, 
    String status, 
    Integer chunkCount) {
}
