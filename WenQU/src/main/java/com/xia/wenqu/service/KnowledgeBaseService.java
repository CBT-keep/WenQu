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
     * 更新知识库
     */
    KBVO updateKnowledgeBase(Long id, Long userId, @Valid KbUpdateDTO kbUpdateDTO);

    /**
     * 删除知识库
     */
    void deleteKnowledgeBase(Long id, Long userId);
}
