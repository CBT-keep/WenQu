package xyz.cbt.wenqu.backend.modules.model.dto;

import lombok.Data;

/** 
 * 模型列表筛选条件
 */
@Data
public class ModelQueryDTO {
    private String type;
    private Boolean enabled;
}
