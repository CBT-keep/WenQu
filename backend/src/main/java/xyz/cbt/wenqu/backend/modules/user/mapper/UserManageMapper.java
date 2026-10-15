package xyz.cbt.wenqu.backend.modules.user.mapper;

import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.data.repository.query.Param;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysUser;

import java.util.List;
import java.util.Optional;

public interface UserManageMapper extends CrudRepository<SysUser, Long> {

    Optional<SysUser> findByUsername(String username);

    @Query("SELECT * FROM sys_user ORDER BY id ASC")
    List<SysUser> findAllOrdered();

    /**
     * 管理端分页查询。keyword 为 null 时整段条件短路（:keyword IS NULL），
     * ILIKE 是 PostgreSQL 的忽略大小写匹配。
     */
    @Query("""
            SELECT * FROM sys_user
            WHERE (:keyword IS NULL OR username ILIKE '%' || :keyword || '%' OR nickname ILIKE '%' || :keyword || '%')
              AND (:role IS NULL OR role = :role)
              AND (:status IS NULL OR status = :status)
            ORDER BY id ASC
            LIMIT :limit OFFSET :offset
            """)
    List<SysUser> search(@Param("keyword") String keyword,
                         @Param("role") String role,
                         @Param("status") String status,
                         @Param("limit") int limit,
                         @Param("offset") int offset);

    @Query("""
            SELECT count(*) FROM sys_user
            WHERE (:keyword IS NULL OR username ILIKE '%' || :keyword || '%' OR nickname ILIKE '%' || :keyword || '%')
              AND (:role IS NULL OR role = :role)
              AND (:status IS NULL OR status = :status)
            """)
    long count(@Param("keyword") String keyword,
               @Param("role") String role,
               @Param("status") String status);
}
