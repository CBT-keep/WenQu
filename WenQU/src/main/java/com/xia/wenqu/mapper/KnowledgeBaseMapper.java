package com.xia.wenqu.mapper;

import com.xia.wenqu.model.entity.KnowledgeBase;
import org.apache.ibatis.annotations.Mapper;

@Mapper
public interface KnowledgeBaseMapper {

    /**
     * 插入知识库
     */
    int insert(KnowledgeBase knowledgeBase);
}
