package xyz.cbt.wenqu.backend.modules.user.vo;

/**
 * 重置密码结果：新密码明文仅此一次出现在响应里，前端要请管理员抄走
 */
public record ResetPasswordVO(Long userId, String username, String newPassword) {
}
