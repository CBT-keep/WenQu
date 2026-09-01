package com.xia.wenqu.mapper;

import com.github.pagehelper.Page;
import com.xia.wenqu.model.entity.KnowledgeBase;
import com.xia.wenqu.model.vo.KBVO;
import com.xia.wenqu.model.vo.RecycleKbVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

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
     * 轻量查询：只拿知识库的切分配置（chunk_size / overlap），无聚合子查询
     */
    KnowledgeBase selectConfigByIdAndUserId(@Param("id")Long id, @Param("userId")Long userId);

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

    /**
     * 回收站：查询用户所有软删除知识库
     */
    List<RecycleKbVO> selectDeletedByUserId(@Param("userId") Long userId);

    /**
     * 回收站：按ID查询软删除知识库实体（用于恢复/永久删除的属主校验）
     */
    KnowledgeBase selectDeletedByIdAndUserId(@Param("id") Long id, @Param("userId") Long userId);

    /**
     * 恢复软删除知识库
     */
    int restoreById(@Param("id") Long id);

    /**
     * 物理删除知识库行（永久删除）
     */
    int deletePhysically(@Param("id") Long id);
}
