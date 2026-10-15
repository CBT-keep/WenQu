package xyz.cbt.wenqu.backend.common;

/**
 * 统一响应体
 */
public record Result<T>(int code, String message, T data, String traceId) {
    public static <T> Result<T> ok(T data) {
        return new Result<>(0, "Success", data, null);
    }

    public static <T> Result<T> error(int code, String message) {
        return new Result<>(code, message, null, null);
    }
}
