package com.xia.wenqu.mapper;

import com.github.pagehelper.Page;
import com.xia.wenqu.model.entity.Message;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface MessageMapper {

    /**
     * 按会话查询消息，按 id 升序（时间正序）
     */
    Page<Message> selectByConversationId(@Param("conversationId") Long conversationId, int page, int pageSize);

    /**
     * 取会话最近 limit 条消息（id 降序，调用方自行反转成时间正序）
     */
    List<Message> selectRecent(@Param("conversationId") Long conversationId, @Param("limit") int limit);

    /**
     * 新增消息（提问或回答，sources 可空）
     */
    int insert(Message message);

    /**
     * 物理删除某会话的所有消息（会话永久删除时使用）
     */
    int deleteByConversationId(@Param("conversationId") Long conversationId);
}
