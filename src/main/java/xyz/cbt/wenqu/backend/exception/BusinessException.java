package xyz.cbt.wenqu.backend.exception;

import lombok.Getter;
import xyz.cbt.wenqu.backend.enumeration.AuthResultCode;

@Getter
public class BusinessException extends RuntimeException {
    private final int code;

    public BusinessException(AuthResultCode authResultCode) {
        super(authResultCode.getMessage());
        this.code = authResultCode.getCode();
    }
    public BusinessException(int code,String message){
        super(message);
        this.code = code;
    }
}
