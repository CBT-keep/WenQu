package com.xia.wenqu.mapper;

import com.github.pagehelper.Page;
import com.xia.wenqu.model.entity.KnowledgeBase;
import com.xia.wenqu.model.vo.KBVO;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface KnowledgeBaseMapper {

    /**
     * 插入知识库
     */
    int insert(KnowledgeBase knowledgeBase);

    /**
     * 查询知识库列表
     */
    Page<KBVO> pageQuery(Long userId, int page, int pageSize);
}
