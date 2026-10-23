package xyz.cbt.wenqu.backend.modules.kb.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface KnowledgeBaseMapper {

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
     * 插入文档
     */
    KnowledgeBaseListProjection findKnowledgeBase(@Param("kbId") long kbId);

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
