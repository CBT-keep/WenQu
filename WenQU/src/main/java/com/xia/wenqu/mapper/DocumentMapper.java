package com.xia.wenqu.mapper;

import com.github.pagehelper.Page;
import com.xia.wenqu.model.entity.Document;
import com.xia.wenqu.model.enums.DocumentStatus;
import com.xia.wenqu.model.vo.DocumentVO;
import com.xia.wenqu.model.vo.RecycleDocVO;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

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

    /**
     * 回收站：查询用户所有软删除文档（含所属知识库名）
     */
    List<RecycleDocVO> selectDeletedByUserId(@Param("userId") Long userId);

    /**
     * 回收站：按ID查询软删除文档实体（用于恢复/永久删除的属主校验）
     */
    Document selectDeletedEntityById(@Param("id") Long id);

    /**
     * 软删除文档（磁盘文件与分块保留）
     */
    int softDelete(@Param("id") Long id);

    /**
     * 恢复软删除文档
     */
    int restoreById(@Param("id") Long id);

    /**
     * 物理删除文档行（永久删除）
     */
    int deletePhysically(@Param("id") Long id);

    /**
     * 查询知识库下所有软删除文档（永久删除知识库时清理磁盘文件用）
     */
    List<Document> selectDeletedByKbId(@Param("kbId") Long kbId);

    /**
     * 恢复知识库下所有软删除文档
     */
    int restoreByKbId(@Param("kbId") Long kbId);

    /**
     * 物理删除知识库下所有文档行（永久删除知识库）
     */
    int deletePhysicallyByKbId(@Param("kbId") Long kbId);
}
