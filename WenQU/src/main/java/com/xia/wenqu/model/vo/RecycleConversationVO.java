package com.xia.wenqu.model.vo;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * 回收站会话项（与文档/知识库回收站分开查询，避免单列表过大）
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RecycleConversationVO {

    private Long id;
    private Long kbId;
    private String kbName;
    private String title;
    private Long messageCount;
    private Long deletedAt;
}
