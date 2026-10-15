package xyz.cbt.wenqu.backend.modules.auth.mapper;

import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysLoginAttempt;

public interface LoginAttemptRepository extends CrudRepository<SysLoginAttempt, Long> {

    /**
     * TODO 之后这里需要换成Redis实现，现在暂时这样
     * 统计最近 minutes 分钟内的连续失败次数。
     */
    @Query("""
            SELECT COUNT(*) FROM sys_login_attempt
            WHERE username = :username
              AND success = false
              AND attempted_at > now() - make_interval(mins => :minutes)
            """)
    long countRecentFailures(@Param("username") String username, @Param("minutes") int minutes);
}
