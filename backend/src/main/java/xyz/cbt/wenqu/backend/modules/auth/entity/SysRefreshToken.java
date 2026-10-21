package xyz.cbt.wenqu.backend.modules.auth.entity;

import lombok.Data;

import java.time.OffsetDateTime;

/**
 * 系统刷新令牌实体类
 */
@Data
public class SysRefreshToken {

    private Long id;
    private Long userId;
    private String jti;
    private OffsetDateTime expiresAt;
    private Boolean revoked;
    private String userAgent;
    private String ip;
    private OffsetDateTime createdAt;
}
