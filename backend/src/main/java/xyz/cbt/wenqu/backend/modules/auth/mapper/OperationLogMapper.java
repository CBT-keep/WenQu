package xyz.cbt.wenqu.backend.modules.auth.mapper;

import org.apache.ibatis.annotations.Mapper;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysOperationLog;

/**
 * 操作日志Mapper接口
 */
@Mapper
public interface OperationLogMapper {
    int insert(SysOperationLog entry);
}
