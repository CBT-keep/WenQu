package xyz.cbt.wenqu.backend.modules.kb.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;
import java.util.Optional;

@Mapper
public interface KnowledgeBaseMapper {
    Long findKnowledgeBaseOwner(@Param("kbId") long kbId);
    List<KnowledgeBaseListProjection> searchKnowledgeBases(@Param("keyword") String keyword,
            @Param("status") String status, @Param("ownerId") Long ownerId);
    List<DocumentListProjection> search(@Param("kbId") long kbId, @Param("keyword") String keyword,
                                        @Param("status") String status);

    /**
     * 详情查询：同时带出 embedding 模型名与归属人用户名，供编辑页回填与更新响应
     */
    Optional<KnowledgeBaseDetailProjection> findById(@Param("kbId") long kbId);
}
