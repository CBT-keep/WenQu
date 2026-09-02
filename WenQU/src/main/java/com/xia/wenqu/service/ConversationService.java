package com.xia.wenqu.service;

import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.model.dto.ConversationCreateDTO;
import com.xia.wenqu.model.vo.ConversationVO;
import com.xia.wenqu.model.vo.MessageVO;
import com.xia.wenqu.model.vo.RecycleBatchResultVO;
import com.xia.wenqu.model.vo.RecycleConversationVO;

import java.util.List;

public interface ConversationService {

    /**
     * 创建会话（校验知识库归属）
     */
    ConversationVO create(Long userId, ConversationCreateDTO dto);

    /**
     * 会话列表，按最近活跃排序
     */
    PageResult<ConversationVO> list(Long userId, int page, int pageSize);

    /**
     * 会话详情（属主校验）
     */
    ConversationVO get(Long id, Long userId);

    /**
     * 会话消息列表，时间正序
     */
    PageResult<MessageVO> listMessages(Long id, Long userId, int page, int pageSize);

    /**
     * 删除会话（软删除，消息保留）
     */
    void delete(Long id, Long userId);

    /**
     * 回收站：软删除会话列表
     */
    List<RecycleConversationVO> listDeleted(Long userId);

    /**
     * 从回收站恢复会话
     */
    void restore(Long id, Long userId);

    /**
     * 永久删除会话：物理删除消息行与会话行
     */
    void purge(Long id, Long userId);

    /**
     * 批量恢复会话：整批一个事务，无效条目跳过并计数
     */
    RecycleBatchResultVO batchRestore(List<Long> ids, Long userId);

    /**
     * 批量永久删除会话：整批一个事务
     */
    RecycleBatchResultVO batchPurge(List<Long> ids, Long userId);
}
