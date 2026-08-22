package com.xia.wenqu.service;

import com.xia.wenqu.model.dto.KbCreateDTO;
import com.xia.wenqu.model.vo.KBVO;

public interface KnowledgeBaseService {

    /**
     * 创建知识库
     */
    KBVO createKnowledgeBase(Long userId, KbCreateDTO kbCreateDTO);
}
