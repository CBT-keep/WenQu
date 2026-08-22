package com.xia.wenqu.model.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class KbUpdateDTO {

    @NotBlank(message = "知识库名称不能为空")
    @Size(max = 50)
    private String name;

    @Size(max = 200)
    private String description;

    @NotNull(message = "分块大小不能为空")
    @Min(value = 200, message = "分块大小范围 200~800")
    @Max(value = 800, message = "分块大小范围 200~800")
    private Integer chunkSize;

    @NotNull(message = "重叠大小不能为空")
    @Min(value = 10, message = "重叠大小范围 10~200")
    @Max(value = 200, message = "重叠大小范围 10~200")
    private Integer overlap;
}
