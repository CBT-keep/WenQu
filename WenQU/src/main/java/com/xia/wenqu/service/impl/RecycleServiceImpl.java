package com.xia.wenqu.service.impl;

import com.xia.wenqu.mapper.DocumentMapper;
import com.xia.wenqu.mapper.KnowledgeBaseMapper;
import com.xia.wenqu.model.vo.RecycleDocVO;
import com.xia.wenqu.model.vo.RecycleKbVO;
import com.xia.wenqu.service.RecycleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 回收站功能实现类
 */
@Service
@RequiredArgsConstructor
public class RecycleServiceImpl implements RecycleService {

    private final DocumentMapper documentMapper;
    private final KnowledgeBaseMapper knowledgeBaseMapper;

    @Override
    public List<RecycleDocVO> listDeletedDocuments(Long userId) {
        return documentMapper.selectDeletedByUserId(userId);
    }

    @Override
    public List<RecycleKbVO> listDeletedKnowledgeBases(Long userId) {
        return knowledgeBaseMapper.selectDeletedByUserId(userId);
    }
}
