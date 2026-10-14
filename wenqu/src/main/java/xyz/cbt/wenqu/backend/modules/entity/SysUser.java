package xyz.cbt.wenqu.backend.modules.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SysUser {
    private Long id;
    private String username;
    private String passwordHash;
    private String nickname;
    private String email;
    private String role;
    private String status;
    private boolean mustChangePassword;
    private Long lastLoginAt;
    private Integer createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
