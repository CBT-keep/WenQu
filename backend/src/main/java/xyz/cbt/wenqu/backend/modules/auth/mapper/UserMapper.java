package xyz.cbt.wenqu.backend.modules.auth.mapper;

import org.springframework.data.jdbc.repository.query.Modifying;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysUser;

import java.util.Optional;

public interface UserMapper extends CrudRepository<SysUser, Long> {

    @Query("SELECT * FROM sys_user WHERE username = :username")
    Optional<SysUser> findByUsername(@Param("username") String username);

    @Modifying
    @Query("UPDATE sys_user SET last_login_at = now() WHERE id = :id")
    int updateLastLoginAt(@Param("id") Long id);

    @Modifying
    @Query("UPDATE sys_user SET password_hash = :hash, must_change_password = false WHERE id = :id")
    int updatePassword(@Param("id") Long id, @Param("hash") String hash);
}
