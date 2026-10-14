package xyz.cbt.wenqu.backend.enumeration;

import lombok.Getter;

@Getter
public enum AuthResultCode {
    SUCCESS(200, "成功"),

    BAD_CREDENTIALS(20001, "用户名或密码错误"),
    ACCOUNT_DISABLED(20002, "账号已被禁用"),
    TOKEN_INVALID_OR_EXPIRED(20003, "Token 无效或已过期"),
    REFRESH_TOKEN_INVALID(20004, "Refresh Token 无效或已吊销"),
    ACCOUNT_LOCKED(20005, "账号已锁定，请稍后重试"),
    NO_PERMISSION(20006, "无权限访问该资源"),
    OLD_PASSWORD_WRONG(20007, "原密码错误"),

    SYSTEM_ERROR(99999, "服务端内部错误");


    private final Integer code;
    private final String message;

    AuthResultCode(Integer code,String msg){
        this.code = code;
        this.message = msg;
    }
}
