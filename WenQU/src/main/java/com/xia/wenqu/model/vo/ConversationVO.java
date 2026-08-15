package com.xia.wenqu.model.vo;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ConversationVO {

    private Long id;
    private Long kbId;
    private String title;
    private Long createdAt;
}
