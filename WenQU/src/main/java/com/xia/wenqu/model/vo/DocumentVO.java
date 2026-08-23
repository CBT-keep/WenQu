package com.xia.wenqu.model.vo;

import com.xia.wenqu.model.enums.DocumentStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
