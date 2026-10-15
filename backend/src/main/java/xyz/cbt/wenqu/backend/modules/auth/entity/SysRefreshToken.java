package xyz.cbt.wenqu.backend.modules.auth.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;

/**
 * 系统刷新令牌实体类
 */
@Data
@Table("sys_refresh_token")
public class SysRefreshToken {

    @Id
    private Long id;
    private Long userId;
    private String jti;
    private OffsetDateTime expiresAt;
    private Boolean revoked;
    private String userAgent;
    private String ip;
    private OffsetDateTime createdAt;
}
