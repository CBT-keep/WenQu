package xyz.cbt.wenqu.backend.modules.auth.mapper;

import org.springframework.data.repository.CrudRepository;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysOperationLog;

public interface OperationLogRepository extends CrudRepository<SysOperationLog, Long> {
}
