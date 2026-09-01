package com.xia.wenqu.model.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
    private LocalDateTime deletedAt;
}
