package xyz.cbt.wenqu.backend.modules.models.dto;

import jakarta.validation.constraints.Pattern;
import lombok.Data;

@Data
public class ModelQueryDTO {
    @Pattern(regexp ="\\s*(CHAT|EMBEDDING|RERANK)?\\s*",message = "models的类型仅支持CHAT或EMBEDDING或RERANK")
    private String type;
    private Boolean enabled;
}
