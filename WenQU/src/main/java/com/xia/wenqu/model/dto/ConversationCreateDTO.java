package com.xia.wenqu.model.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ConversationCreateDTO {

    @NotNull(message = "kbId 不能为空")
    private Long kbId;
}
