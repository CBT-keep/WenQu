package xyz.cbt.wenqu.backend.modules.kb.mapper;

import java.time.OffsetDateTime;

public record DocumentListProjection(Long id, Long kbId, String name, String fileType, Long fileSize,
                                     Integer charCount, Integer chunkCount, String status, String errorMsg,
                                     OffsetDateTime createdAt, OffsetDateTime updatedAt, Integer progress) {
}
