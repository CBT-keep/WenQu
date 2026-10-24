package xyz.cbt.wenqu.backend.common;

/**
 * 业务错误码
 */
public final class ErrorCode {
    public static final int BAD_REQUEST = 10001;             // 参数校验失败
    public static final int RESOURCE_NOT_FOUND = 10002;      // 通用资源不存在
    public static final int RESOURCE_CONFLICT = 10003;       // 资源冲突
    public static final int OPERATION_NOT_ALLOWED = 10004;   // 当前状态下不允许操作

    public static final int BAD_CREDENTIALS = 20001;    // 用户名或密码错误
    public static final int ACCOUNT_DISABLED = 20002;   // 账号已禁用
    public static final int TOKEN_INVALID = 20003;      // Token 无效或已过期
    public static final int REFRESH_INVALID = 20004;    // Refresh Token 无效或已吊销
    public static final int ACCOUNT_LOCKED = 20005;     // 账号被锁定
    public static final int FORBIDDEN = 20006;          // 无权限访问资源
    public static final int OLD_PASSWORD_WRONG = 20007; // 原密码错误

    public static final int MODEL_NOT_AVAILABLE = 30001; // 模型不存在或已禁用
    public static final int MODEL_DEFAULT_EXISTS = 30004; // 该类型已存在默认模型

    public static final int KNOWLEDGE_BASE_NOT_FOUND = 40001; // 知识库不存在
    public static final int VECTOR_DIMENSION_MISMATCH = 40006; // 向量维度不匹配

    public static final int CANNOT_DELETE_SELF = 70002; // 不可删除当前登录账号
    public static final int INTERNAL_ERROR = 99999;     // 服务端内部错误

    private ErrorCode() {
    }
}
