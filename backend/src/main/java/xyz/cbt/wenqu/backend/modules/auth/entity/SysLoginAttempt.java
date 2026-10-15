package xyz.cbt.wenqu.backend.modules.auth.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;

/**
 * 登录尝试实体类
 */
@Data
@Table("sys_login_attempt")
public class SysLoginAttempt {

    @Id
    private Long id;
    private String username;
    private String ip;
    private Boolean success;
    private OffsetDateTime attemptedAt;
}
