package com.xia.wenqu.mapper;

import com.xia.wenqu.model.entity.DocChunk;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

/**
 * 切分器mapper层
 *
 * @author hbk
 * @version 1.0
 * @date 2026/8/25 09:48
 */
@Mapper
public interface DocChunkMapper {
    /**
     * 批量插入分块
     */
    int batchInsert(@Param("chunks")List<DocChunk> chunks);

    /**
     * 删除某文档的所有分块
     */
    int deleteByDocumentId(@Param("documentId") Long documentId);
}
