package com.xia.wenqu.model.vo;

import com.xia.wenqu.model.enums.DocumentStatus;
import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DocumentVO {

    private Long id;
    private Long kbId;
    private String name;
    private String type;
    private DocumentStatus status;
    private Long size;
    private Long chunkCount;
    private String errorMsg;
    private Long createdAt;
}
