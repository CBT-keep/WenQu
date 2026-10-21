package xyz.cbt.wenqu.backend.common;

import lombok.Getter;

/**
 * 业务异常：携带业务错误码与对应的 HTTP 状态码，
 * 由 GlobalExceptionHandler 统一转成 Result 响应体。
 */
@Getter
public class BizException extends RuntimeException {

    private final int code;
    private final int httpStatus;

    public BizException(int code, String message, int httpStatus) {
        super(message);
        this.code = code;
        this.httpStatus = httpStatus;
    }

    public static BizException badCredentials() {
        return new BizException(ErrorCode.BAD_CREDENTIALS, "用户名或密码错误", 401);
    }

    public static BizException accountDisabled() {
        return new BizException(ErrorCode.ACCOUNT_DISABLED, "账号已禁用", 401);
    }

    public static BizException accountLocked(int minutes) {
        return new BizException(ErrorCode.ACCOUNT_LOCKED,
                "账号已被锁定，请 " + minutes + " 分钟后再试", 401);
    }

    public static BizException refreshInvalid() {
        return new BizException(ErrorCode.REFRESH_INVALID, "Refresh Token 无效或已吊销", 401);
    }

    public static BizException oldPasswordWrong() {
        return new BizException(ErrorCode.OLD_PASSWORD_WRONG, "原密码错误", 400);
    }

    public static BizException usernameTaken() {
        return new BizException(ErrorCode.USERNAME_TAKEN, "用户名已存在", 409);
    }

    public static BizException userNotFound() {
        return new BizException(ErrorCode.USER_NOT_FOUND, "用户不存在", 404);
    }

    /**
     * 业务规则类错误：约定返回 HTTP 200 + 非 0 code
     */
    public static BizException cannotDeleteSelf() {
        return new BizException(ErrorCode.CANNOT_DELETE_SELF, "不能删除当前登录账号", 200);
    }

    public static BizException badRequest(String message) {
        return new BizException(ErrorCode.BAD_REQUEST, message, 400);
    }

    public static BizException knowledgeBaseNotFound() {
        return new BizException(ErrorCode.KNOWLEDGE_BASE_NOT_FOUND, "知识库不存在", 404);
    }

    public static BizException forbiddenResource() {
        return new BizException(ErrorCode.FORBIDDEN_RESOURCE, "无权访问该知识库", 403);
    }
}
