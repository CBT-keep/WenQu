package xyz.cbt.wenqu.backend.modules.auth.entity;

import lombok.Data;

import java.time.OffsetDateTime;

/**
 * 登录尝试实体类
 */
@Data
public class SysLoginAttempt {

    private Long id;
    private String username;
    private String ip;
    private Boolean success;
    private OffsetDateTime attemptedAt;
}
