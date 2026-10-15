package xyz.cbt.wenqu.backend.modules.auth.mapper;

import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysSetting;

import java.util.Optional;

/**
 * 只读 sys_setting
 */
public interface SystemSettingRepository extends CrudRepository<SysSetting, Long> {

    @Query("SELECT * FROM sys_setting WHERE key = :key")
    Optional<SysSetting> findByKey(@Param("key") String key);
}
