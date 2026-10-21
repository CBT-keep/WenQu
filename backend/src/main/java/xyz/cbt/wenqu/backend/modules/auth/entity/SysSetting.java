package xyz.cbt.wenqu.backend.modules.auth.entity;

import lombok.Data;

import java.time.OffsetDateTime;

/**
 * 系统设置实体类
 */
@Data
public class SysSetting {

    private Long id;
    private String key;
    private String value;
    private String valueType;
    private String groupName;
    private String description;
    private Long updatedBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
