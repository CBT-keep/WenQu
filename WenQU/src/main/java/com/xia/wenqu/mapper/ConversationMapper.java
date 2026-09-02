package com.xia.wenqu.mapper;

import com.github.pagehelper.Page;
import com.xia.wenqu.model.entity.Conversation;
import com.xia.wenqu.model.vo.ConversationVO;
import com.xia.wenqu.model.vo.RecycleConversationVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ConversationMapper {

    /**
     * 插入会话（title 省略时走数据库默认值"新对话"）
     */
    int insert(Conversation conversation);

    /**
     * 查询用户的会话列表，按最近活跃排序
     */
    Page<ConversationVO> pageQuery(@Param("userId") Long userId, int page, int pageSize);

    /**
     * 按ID查询会话（属主校验用）
     */
    ConversationVO selectByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * 软删除会话（消息保留）
     */
    int softDelete(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * 回收站：查询用户所有软删除会话
     */
    List<RecycleConversationVO> selectDeletedByUserId(@Param("userId") Long userId);

    /**
     * 回收站：按ID查询软删除会话实体（恢复/永久删除的属主校验用）
     */
    Conversation selectDeletedByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * 恢复软删除会话
     */
    int restoreById(@Param("id") Long id);

    /**
     * 物理删除会话行（永久删除，消息行由 MessageMapper 单独清理）
     */
    int deletePhysically(@Param("id") Long id);
}
