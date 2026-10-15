package xyz.cbt.wenqu.backend.modules.user.vo;

import xyz.cbt.wenqu.backend.modules.auth.entity.SysUser;

public record UserOptionVO(Long id, String username, String nickname) {

    public static UserOptionVO from(SysUser u) {
        return new UserOptionVO(u.getId(), u.getUsername(), u.getNickname());
    }
}
