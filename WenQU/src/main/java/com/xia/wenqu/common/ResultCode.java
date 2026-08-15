package com.xia.wenqu.common;

import lombok.Getter;

@Getter
public enum ResultCode {

    SUCCESS(0, "success", 200),
    PARAM_ERROR(40000, "请求参数错误", 400),
    BODY_FORMAT_ERROR(40001, "请求体格式错误", 400),
    INVALID_USERNAME(40002, "用户名格式不合法", 400),
    WEAK_PASSWORD(40003, "密码强度不足", 400),
    FILE_EMPTY(40004, "文件不能为空", 400),
    UNSUPPORTED_FILE_TYPE(40005, "不支持的文件类型", 400),
    FILE_TOO_LARGE(40006, "文件大小超限", 400),
    INVALID_PAGE_PARAM(40007, "分页参数不合法", 400),
    UNAUTHORIZED(40100, "未登录或 token 无效", 401),
    TOKEN_EXPIRED(40101, "token 已过期", 401),
    BAD_CREDENTIALS(40102, "用户名或密码错误", 401),
    FORBIDDEN(40300, "无权限访问该资源", 403),
    KB_NOT_FOUND(40400, "知识库不存在", 404),
    DOCUMENT_NOT_FOUND(40401, "文档不存在", 404),
    CONVERSATION_NOT_FOUND(40402, "会话不存在", 404),
    MESSAGE_NOT_FOUND(40403, "消息不存在", 404),
    USERNAME_EXISTS(40900, "用户名已存在", 409),
    KB_NAME_DUPLICATE(40901, "知识库名称重复", 409),
    ILLEGAL_STATE(42200, "业务状态不允许该操作", 422),
    INVALID_KB_PARAM(42201, "知识库参数不合法", 422),
    INTERNAL_ERROR(50000, "系统内部错误", 500),
    DB_ERROR(50001, "数据库操作失败", 500),
    LLM_ERROR(50200, "大模型服务调用失败", 502),
    EMBEDDING_ERROR(50201, "向量化服务调用失败", 502),
    EXTERNAL_TIMEOUT(50202, "外部服务超时", 502);

    private final int code;
    private final String message;
    private final int httpStatus;

    ResultCode(int code, String message, int httpStatus) {
        this.code = code;
        this.message = message;
        this.httpStatus = httpStatus;
    }
}
