package xyz.cbt.wenqu.backend.modules.kb.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import xyz.cbt.wenqu.backend.modules.kb.entity.KnowledgeBase;

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

    /**
     * 按主键更新；只更新实体中非 null 的字段由 XML 动态判断，
     * separators 以字符串形式写入 jsonb。
     */
    int update(KnowledgeBase kb);

    /**
     * 取模型类型、维度与全局维度，供 embedding 模型校验（是否为 EMBEDDING 且维度匹配）
     */
    EmbeddingModelCheckProjection findEmbeddingModelCheck(@Param("modelId") long modelId);

    int deleteById(@Param("kbId") long kbId);

    KnowledgeBaseStatsProjection findStats(@Param("kbId") long kbId);
}
