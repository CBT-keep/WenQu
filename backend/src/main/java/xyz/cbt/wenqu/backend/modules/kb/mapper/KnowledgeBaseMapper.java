package xyz.cbt.wenqu.backend.modules.kb.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import xyz.cbt.wenqu.backend.modules.kb.vo.KnowledgeBaseOptionVO;
import java.util.List;

@Mapper
public interface KnowledgeBaseMapper {

    /**
     * 查询知识库下拉选项
     */
    List<KnowledgeBaseOptionVO> findOptions(@Param("ownerId") Long ownerId);

    /**
     * 查询知识库的所有者
     */
    Long findKnowledgeBaseOwner(@Param("kbId") long kbId);

    /**
     * 查询知识库的模型
     */
    KnowledgeBaseModelProjection findModel(@Param("id") long id);

    /**
     * 查询知识库的设置
     */
    String findSetting(@Param("key") String key);

    /**
     * 查询知识库的ID
     */
    Long findIdByNameAndOwner(
        @Param("name") String name, 
        @Param("ownerId") long ownerId
    );

    /**
     * 插入知识库
     */
    long insertKnowledgeBase(KnowledgeBaseInsert value);

    /**
     * 查询知识库
     */
    KnowledgeBaseListProjection findKnowledgeBase(@Param("kbId") long kbId);

    /**
     * 查询知识库的配置
     */
    KnowledgeBaseConfigProjection findConfig(@Param("kbId") long kbId);

    /**
     * 锁定知识库
     */
    Long lockKnowledgeBase(@Param("kbId") long kbId);

    /**
     * 更新知识库
     */
    int updateKnowledgeBase(@Param("kbId") long kbId, @Param("value") KnowledgeBaseInsert value,
                           @Param("indexStale") boolean indexStale);

    /**
     * 查询文档所属的知识库
     */
    Long findDocumentKnowledgeBase(@Param("docId") long docId);

    /**
     * 查询文档的内容块
     */
    List<ChunkProjection> searchChunks(@Param("docId") long docId, @Param("keyword") String keyword);

    /**
     * 查询知识库的统计信息
     */
    KnowledgeBaseStatsProjection findStats(@Param("kbId") long kbId);

    /**
     * 查询知识库列表
     */
    List<KnowledgeBaseListProjection> searchKnowledgeBases(
        @Param("keyword") String keyword,
        @Param("status") String status, 
        @Param("ownerId") Long ownerId
    );

    /**
     * 查询文档列表
     */
    List<DocumentListProjection> search(
        @Param("kbId") long kbId, 
        @Param("keyword") String keyword,
        @Param("status") String status
    );
}
