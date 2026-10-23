package xyz.cbt.wenqu.backend.common;

import org.slf4j.MDC;
import xyz.cbt.wenqu.backend.common.log.TraceIdFilter;

/**
 * 统一响应体
 */
public record Result<T>(int code, String message, T data, String traceId) {
    public static <T> Result<T> ok(T data) {
        return new Result<>(0, "success", data, MDC.get(TraceIdFilter.TRACE_ID_KEY));
    }

    public static <T> Result<T> error(int code, String message) {
        return new Result<>(code, message, null, MDC.get(TraceIdFilter.TRACE_ID_KEY));
    }
}
