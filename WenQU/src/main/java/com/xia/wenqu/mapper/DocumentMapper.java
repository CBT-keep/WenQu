package com.xia.wenqu.mapper;

import com.github.pagehelper.Page;
import com.xia.wenqu.model.entity.Document;
import com.xia.wenqu.model.enums.DocumentStatus;
import com.xia.wenqu.model.vo.DocumentVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * @author hbk
 * @version 1.0
 * @date 2026/8/23 16:13
 */
@Mapper
public interface DocumentMapper {
    /**
     * 插入文档数据
     */
    int insert(Document doc);

    /**
     * 文档列表查询
     */
    Page<DocumentVO> query(Long kbId, int page, int pageSize);

    /**
     * 文档详情查询
     */
    DocumentVO selectById(@Param("id") Long id);

    /**
     * 查询整个实体
     */
    Document selectEntityById(@Param("id") Long id);

    /**
     * 更新处理状态，失败时记录错误信息
     */
    int updateStatus(@Param("id") Long id, @Param("status") DocumentStatus status, @Param("errorMsg") String errorMsg);

    /**
     * 回填切分后的块数
     */
    int updateChunkCount(@Param("id") Long id, @Param("chunkCount") int chunkCount);

    /**
     * 更新文件路径和状态（上传成功后回填）
     */
    int updateFilePath(Document doc);
}
