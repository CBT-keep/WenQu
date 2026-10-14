package xyz.cbt.wenqu.backend.result;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.slf4j.MDC;
import xyz.cbt.wenqu.backend.enumeration.AuthResultCode;
import xyz.cbt.wenqu.backend.security.TraceFilter;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Result<T>{
    private int code;
    private String message;
    private T data;
    private String traceId;

    //成功，不带数据
    public static <T> Result<T> success(AuthResultCode authResultCode){
        return build(authResultCode, null);
    }
    //成功，带数据
    public static <T> Result<T> success(AuthResultCode authResultCode, T data){
        return build(authResultCode, data);
    }

    public static <T> Result<T> error(int code, String message){
        Result<T> result = new Result<>();
        result.setCode(code);
        result.setMessage(message);
        result.setData(null);
        result.setTraceId(MDC.get(TraceFilter.TRACE_ID_KEY));
        return result;
    }
    public static <T> Result<T> error(AuthResultCode authResultCode){
        return error(authResultCode.getCode(), authResultCode.getMessage());
    }

    public static <T> Result<T> error(AuthResultCode authResultCode,String message){
        return error(authResultCode.getCode(), message);
    }

    private static <T> Result<T> build(AuthResultCode authResultCode, T data) {
        Result<T> result = new Result<>();
        result.setCode(authResultCode.getCode());
        result.setMessage(authResultCode.getMessage());
        result.setData(data);
        result.setTraceId(MDC.get(TraceFilter.TRACE_ID_KEY));
        return result;
    }
}
