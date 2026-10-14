package xyz.cbt.wenqu.backend.handler;

import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import xyz.cbt.wenqu.backend.enumeration.AuthResultCode;
import xyz.cbt.wenqu.backend.exception.BusinessException;
import xyz.cbt.wenqu.backend.result.Result;

@RestControllerAdvice
@Slf4j
public class GlobalExceptionHandler {

    @ExceptionHandler(BusinessException.class)
    public Result<?> handlerBusinessException(BusinessException e) {
        return Result.error(e.getCode(), e.getMessage());
    }

    @ExceptionHandler(Exception.class)
    public Result<?> handleException(Exception e) {
        log.error("系统异常：{}", e.getMessage());
        return Result.error(AuthResultCode.SYSTEM_ERROR,"系统异常");
    }
}
