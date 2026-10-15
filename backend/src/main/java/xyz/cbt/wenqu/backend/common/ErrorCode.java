package xyz.cbt.wenqu.backend.common;

/**
 * 业务错误码
 */
public final class ErrorCode {

    public static final int BAD_CREDENTIALS = 20001;    // 用户名或密码错误
    public static final int ACCOUNT_DISABLED = 20002;   // 账号已禁用
    public static final int REFRESH_INVALID = 20004;    // Refresh Token 无效或已吊销
    public static final int ACCOUNT_LOCKED = 20005;     // 账号被锁定
    public static final int OLD_PASSWORD_WRONG = 20007; // 原密码错误
    public static final int USERNAME_TAKEN = 10003;     // 用户名已存在（资源冲突）
    public static final int USER_NOT_FOUND = 10004;     // 用户不存在
    public static final int FORBIDDEN = 20006;          // 无权限（doc/04 §1.4）
    public static final int CANNOT_DELETE_SELF = 70002; // 不可删除当前登录账号
    public static final int BAD_REQUEST = 40000;        // 参数不合法
    public static final int INTERNAL_ERROR = 50000;     // 服务器内部错误

    private ErrorCode() {
    }
}
