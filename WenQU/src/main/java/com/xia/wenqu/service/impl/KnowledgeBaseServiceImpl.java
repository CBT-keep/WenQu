package com.xia.wenqu.service.impl;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.mapper.KnowledgeBaseMapper;
import com.xia.wenqu.model.dto.KbCreateDTO;
import com.xia.wenqu.model.entity.KnowledgeBase;
import com.xia.wenqu.model.vo.KBVO;
import com.xia.wenqu.service.KnowledgeBaseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class KnowledgeBaseServiceImpl implements KnowledgeBaseService {

    private final KnowledgeBaseMapper knowledgeBaseMapper;

    /**
     * 创建知识库
     */
    @Override
    public KBVO createKnowledgeBase(Long userId, KbCreateDTO kbCreateDTO) {
        // 组装实体
        KnowledgeBase knowledgeBase = KnowledgeBase.builder()
                .userId(userId)
                .name(kbCreateDTO.getName())
                .description(kbCreateDTO.getDescription())
                .chunkSize(kbCreateDTO.getChunkSize() == null ? 400 : kbCreateDTO.getChunkSize())
                .overlap(kbCreateDTO.getOverlap() == null ? 80 : kbCreateDTO.getOverlap())
                .build();

        // 插入数据库
        knowledgeBaseMapper.insert(knowledgeBase);

        // 返回结果
        return KBVO.builder()
                .id(knowledgeBase.getId())
                .name(knowledgeBase.getName())
                .description(knowledgeBase.getDescription())
                .chunkSize(knowledgeBase.getChunkSize())
                .overlap(knowledgeBase.getOverlap())
                .docCount(0L)
                .chunkCount(0L)
                .createdAt(System.currentTimeMillis())
                .build();
    }

    /**
     * 查询知识库列表
     */
    @Override
    public PageResult<KBVO> listKnowledgeBases(Long userId, int page, int pageSize) {
        // 使用PageHelper进行分页查询
        PageHelper.startPage(page, pageSize);

        // 查询知识库列表
        Page<KBVO> pageQuery = knowledgeBaseMapper.pageQuery(userId, page, pageSize);
        long total = pageQuery.getTotal();
        List<KBVO> records = pageQuery.getResult();

        // 返回分页结果
        return new PageResult<>(records, total, page, pageSize);
    }
}
