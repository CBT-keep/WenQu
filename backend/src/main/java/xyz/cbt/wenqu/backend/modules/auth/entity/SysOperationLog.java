package xyz.cbt.wenqu.backend.modules.auth.entity;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Table;

import java.time.OffsetDateTime;

/**
 * 操作审计日志（sys_operation_log）
 */
@Data
@Table("sys_operation_log")
public class SysOperationLog {
    @Id
    private Long id;

    private Long userId;
    private String username;
    /** LOGIN / KB / DOC / CHAT / SQL / SYSTEM */
    private String type;
    private String action;
    private String target;
    private String detail;
    private String ip;
    private String userAgent;
    /** SUCCESS / FAILURE */
    private String result;
    private String traceId;

    // 同 sys_refresh_token 的教训：NOT NULL DEFAULT now() 必须显式赋值
    private OffsetDateTime createdAt;
}
