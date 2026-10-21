package xyz.cbt.wenqu.backend.modules.auth.entity;

import lombok.Data;

import java.time.OffsetDateTime;

/**
 * 系统用户实体类
 */
@Data
public class SysUser {
    private Long id;

    private String username;
    private String passwordHash;
    private String nickname;
    private String email;
    private String role;
    private String status;
    private Boolean mustChangePassword;
    private OffsetDateTime lastLoginAt;
    private Long createdBy;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
