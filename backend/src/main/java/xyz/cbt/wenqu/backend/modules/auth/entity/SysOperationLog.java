package xyz.cbt.wenqu.backend.modules.auth.entity;

import lombok.Data;

import java.time.OffsetDateTime;

/**
 * 操作审计日志（sys_operation_log）
 */
@Data
public class SysOperationLog {
    private Long id;

    private Long userId;
    private String username;
    private String type;
    private String action;
    private String target;
    private String detail;
    private String ip;
    private String userAgent;
    private String result;
    private String traceId;

    // 同 sys_refresh_token 的教训：NOT NULL DEFAULT now() 必须显式赋值
    private OffsetDateTime createdAt;
}
