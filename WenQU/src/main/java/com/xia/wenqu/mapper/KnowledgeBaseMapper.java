package com.xia.wenqu.mapper;

import com.github.pagehelper.Page;
import com.xia.wenqu.model.entity.KnowledgeBase;
import com.xia.wenqu.model.vo.KBVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

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

    /**
     * 查询知识库详情
     */
    KBVO selectByIdAndUserId(@Param("id")Long id, @Param("userId")Long userId);

    /**
     * 更新知识库
     */
    void updateById(KnowledgeBase knowledgeBase);

    /**
     * 删除操作相关接口
     */
    int deleteById(@Param("id") Long id);
    int deleteDocumentsByKbId(@Param("kbId") Long kbId);
    int deleteChunksByKbId(@Param("kbId") Long kbId);
}
