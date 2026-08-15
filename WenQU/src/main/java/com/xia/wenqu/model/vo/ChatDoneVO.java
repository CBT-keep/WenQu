package com.xia.wenqu.model.vo;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class ChatDoneVO {

    private String fullContent;
    private List<SourceVO> sources;
}
