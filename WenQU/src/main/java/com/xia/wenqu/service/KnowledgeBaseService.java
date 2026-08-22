package com.xia.wenqu.service;

import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.model.dto.KbCreateDTO;
import com.xia.wenqu.model.vo.KBVO;

public interface KnowledgeBaseService {

    /**
     * 创建知识库
     */
    KBVO createKnowledgeBase(Long userId, KbCreateDTO kbCreateDTO);

    /**
     * 查询知识库列表
     */
    PageResult<KBVO> listKnowledgeBases(Long userId, int page, int pageSize);
}
