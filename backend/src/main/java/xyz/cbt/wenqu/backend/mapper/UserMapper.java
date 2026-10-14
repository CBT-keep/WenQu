package xyz.cbt.wenqu.backend.mapper;

import org.apache.ibatis.annotations.Mapper;
import xyz.cbt.wenqu.backend.modules.entity.SysUser;

@Mapper
public interface UserMapper {

    /**
     * 根据用户名查询用户信息
     * @param username
     * @return
     */
    SysUser selectByUsername(String username);
}
