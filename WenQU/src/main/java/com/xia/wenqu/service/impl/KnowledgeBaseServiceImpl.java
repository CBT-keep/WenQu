package com.xia.wenqu.service.impl;

import com.github.pagehelper.Page;
import com.github.pagehelper.PageHelper;
import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.common.ResultCode;
import com.xia.wenqu.common.exception.BusinessException;
import com.xia.wenqu.mapper.KnowledgeBaseMapper;
import com.xia.wenqu.model.dto.KbCreateDTO;
import com.xia.wenqu.model.dto.KbUpdateDTO;
import com.xia.wenqu.model.entity.KnowledgeBase;
import com.xia.wenqu.model.vo.KBVO;
import com.xia.wenqu.service.KnowledgeBaseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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

    /**
     * 查询知识库详情
     */
    @Override
    public KBVO getKnowledgeBase(Long id, Long userId) {
        KBVO kbvo = knowledgeBaseMapper.selectByIdAndUserId(id, userId);
        if (kbvo == null) {
            throw new BusinessException(ResultCode.KB_NOT_FOUND); // 不存在或无权访问，统一提示
        }
        return kbvo;
    }

    /**
     * 编辑知识库
     */
    @Override
    public KBVO updateKnowledgeBase(Long id, Long userId, @Valid KbUpdateDTO kbUpdateDTO) {
        // 查询知识库是否存在，并且属于当前用户
        KBVO kbvo = knowledgeBaseMapper.selectByIdAndUserId(id, userId);
        if (kbvo == null) {
            throw new BusinessException(ResultCode.KB_NOT_FOUND); // 不存在或无权访问
        }

        // 鉴权通过，组装实体，并更新数据库
        KnowledgeBase knowledgeBase = KnowledgeBase.builder()
                .id(id)
                .userId(userId)
                .name(kbUpdateDTO.getName())
                .description(kbUpdateDTO.getDescription())
                .chunkSize(kbUpdateDTO.getChunkSize())
                .overlap(kbUpdateDTO.getOverlap())
                .updatedAt(LocalDateTime.now())
                .build();
        knowledgeBaseMapper.updateById(knowledgeBase);
        return KBVO.builder()
                .id(knowledgeBase.getId())
                .name(knowledgeBase.getName())
                .description(knowledgeBase.getDescription())
                .chunkSize(knowledgeBase.getChunkSize())
                .overlap(knowledgeBase.getOverlap())
                .docCount(0L)
                .chunkCount(0L)
                .createdAt(
                        knowledgeBase.getCreatedAt() != null ?
                        knowledgeBase.getCreatedAt().atZone(java.time.ZoneId.systemDefault()).toInstant().toEpochMilli() :
                        System.currentTimeMillis())
                .build();
    }

    /**
     * 删除知识库
     */
    @Override
    @Transactional
    public void deleteKnowledgeBase(Long id, Long userId) {
        // 查询知识库是否存在，并且属于当前用户
        KBVO kbvo = knowledgeBaseMapper.selectByIdAndUserId(id, userId);
        if (kbvo == null) {
            throw new BusinessException(ResultCode.KB_NOT_FOUND); // 不存在或无权访问
        }

        // 鉴权通过，删除知识库
        knowledgeBaseMapper.deleteById(id);

        // 删除级联下的所有相关文档
        knowledgeBaseMapper.deleteDocumentsByKbId(id);
        knowledgeBaseMapper.deleteChunksByKbId(id);
    }
}
