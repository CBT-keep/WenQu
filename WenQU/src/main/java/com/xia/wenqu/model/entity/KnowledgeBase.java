package com.xia.wenqu.model.entity;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class KnowledgeBase {
    private Long id;
    private Long userId;
    private String name;
    private String description;
    private Integer chunkSize;
    private Integer overlap;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer deleted;
}
