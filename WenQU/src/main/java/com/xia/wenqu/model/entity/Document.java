package com.xia.wenqu.model.entity;

import com.xia.wenqu.model.enums.DocumentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/**
 * 文档实体类
 *
 * @author hbk
 * @version 1.0
 * @date 2026/8/23 15:01
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Document {
    private Long id;
    private Long kbId;
    private Long userId;
    private String name;
    private String type;
    private Long size;
    private DocumentStatus status;
    private String filePath;
    private String errorMsg;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Integer deleted;
}
