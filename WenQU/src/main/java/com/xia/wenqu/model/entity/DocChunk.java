package com.xia.wenqu.model.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 文档小分块
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DocChunk {
    private Long id;
    private Long documentId;
    private Long kbId;
    private Integer seq;
    private String content;
    private String sectionPath;
    private LocalDateTime createdAt;
}