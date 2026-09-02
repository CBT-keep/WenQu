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
public class Message {
    private Long id;
    private Long conversationId;
    private String role;
    private String content;
    /**
     * 数据库中为 JSON 字符串（SourceVO 快照数组），由服务层解析成 List<SourceVO>
     */
    private String sources;
    private LocalDateTime createdAt;
}
