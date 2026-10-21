package xyz.cbt.wenqu.backend.modules.kb.vo;

import xyz.cbt.wenqu.backend.modules.kb.mapper.DocumentListProjection;

import java.time.OffsetDateTime;

public record DocumentListVO(Long id, Long kbId, String name, String fileType, Long fileSize,
                             Integer charCount, Integer chunkCount, String status, Integer progress,
                             String errorMsg, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    public static DocumentListVO from(DocumentListProjection row) {
        return new DocumentListVO(row.id(), row.kbId(), row.name(), row.fileType(), row.fileSize(),
                row.charCount(), row.chunkCount(), row.status(), row.progress(), row.errorMsg(),
                row.createdAt(), row.updatedAt());
    }
}
