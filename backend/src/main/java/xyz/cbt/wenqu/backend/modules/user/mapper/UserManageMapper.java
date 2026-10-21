package xyz.cbt.wenqu.backend.modules.user.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import xyz.cbt.wenqu.backend.modules.auth.entity.SysUser;
import java.util.List;
import java.util.Optional;

@Mapper
public interface UserManageMapper {
    Optional<SysUser> findByUsername(@Param("username") String username);
    Optional<SysUser> findById(@Param("id") Long id);
    List<SysUser> findAllOrdered();
    int insert(SysUser user);
    int update(SysUser user);
    int deleteById(@Param("id") Long id);
    List<SysUser> search(@Param("keyword") String keyword, @Param("role") String role,
                         @Param("status") String status, @Param("limit") int limit, @Param("offset") long offset);
    long count(@Param("keyword") String keyword, @Param("role") String role, @Param("status") String status);
}
