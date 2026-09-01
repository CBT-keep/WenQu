package com.xia.wenqu.service;

import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.model.dto.KbCreateDTO;
import com.xia.wenqu.model.dto.KbUpdateDTO;
import com.xia.wenqu.model.vo.KBVO;
import jakarta.validation.Valid;

public interface KnowledgeBaseService {

    /**
     * 创建知识库
     */
    KBVO createKnowledgeBase(Long userId, KbCreateDTO kbCreateDTO);

    /**
     * 查询知识库列表
     */
    PageResult<KBVO> listKnowledgeBases(Long userId, int page, int pageSize);

    /**
     * 查询知识库详情
     */
    KBVO getKnowledgeBase(Long id, Long userId);

    /**
     * 校验知识库是否存在且属于当前用户，否则抛 KB_NOT_FOUND
     */
    void validateKnowledgeBase(Long kbId, Long userId);

    /**
     * 更新知识库
     */
    KBVO updateKnowledgeBase(Long id, Long userId, @Valid KbUpdateDTO kbUpdateDTO);

    /**
     * 删除知识库
     */
    void deleteKnowledgeBase(Long id, Long userId);

    /**
     * 从回收站恢复知识库，并级联恢复其下所有软删除文档
     */
    void restoreKnowledgeBase(Long id, Long userId);

    /**
     * 永久删除知识库：级联物理删除其下文档的分块、文档行、磁盘文件与知识库行
     */
    void purgeKnowledgeBase(Long id, Long userId);
}
