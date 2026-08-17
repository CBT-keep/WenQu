package com.xia.wenqu.mapper;

import com.xia.wenqu.model.entity.User;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface UserMapper {

    /**
     * 根据用户名查询用户信息
     */
    User findByUsername(String username);

    /**
     * 插入用户信息
     */
    int insert(User user);

    /**
     * 根据用户名查询用户数量,注册防止重复
     */
    int countByUsername(String username);
}
