package xyz.cbt.wenqu.backend.modules.model.vo;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModelTestVO {
    private Boolean success;
    private Long latencyMs;
    private String modelName;
    private String echo;
    private String detail;
}
