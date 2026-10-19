package xyz.cbt.wenqu.backend.common.log;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysOperationLog;
import xyz.cbt.wenqu.backend.modules.auth.mapper.OperationLogRepository;

/**
 * 操作日志异步落库
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OpLogWriter {

    private final OperationLogRepository operationLogRepository;

    @Async("opLogExecutor")
    public void write(SysOperationLog entry) {
        try {
            operationLogRepository.save(entry);
        } catch (Exception e) {
            log.warn("操作日志持久化失败: {}", e.getMessage());
        }
    }
}