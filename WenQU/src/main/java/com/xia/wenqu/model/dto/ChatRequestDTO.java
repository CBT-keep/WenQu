package com.xia.wenqu.model.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ChatRequestDTO {

    @NotNull(message = "conversationId 不能为空")
    private Long conversationId;

    @NotNull(message = "kbId 不能为空")
    private Long kbId;

    @NotBlank(message = "问题不能为空")
    private String question;
}
