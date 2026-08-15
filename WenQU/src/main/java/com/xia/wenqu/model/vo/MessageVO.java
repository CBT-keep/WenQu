package com.xia.wenqu.model.vo;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class MessageVO {

    private Long id;
    private Long conversationId;
    private String role;
    private String content;
    private List<SourceVO> sources;
    private Long createdAt;
}
