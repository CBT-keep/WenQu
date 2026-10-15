package xyz.cbt.wenqu.backend.modules.auth.vo;

import lombok.Builder;
import lombok.Data;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysUser;

import java.time.OffsetDateTime;

/**
 * 响应给前端的用户信息
 */
@Data
@Builder
public class UserVO {
    private Long id;
    private String username;
    private String nickname;
    private String email;
    private String role;
    private String status;
    private Boolean mustChangePassword;
    private OffsetDateTime lastLoginAt;
    private OffsetDateTime createdAt;

    /** 管理端列表 / 详情与登录响应共用一份 VO */
    public static UserVO from(SysUser u) {
        return UserVO.builder()
                .id(u.getId())
                .username(u.getUsername())
                .nickname(u.getNickname())
                .email(u.getEmail())
                .role(u.getRole())
                .status(u.getStatus())
                .mustChangePassword(u.getMustChangePassword())
                .lastLoginAt(u.getLastLoginAt())
                .createdAt(u.getCreatedAt())
                .build();
    }
}
