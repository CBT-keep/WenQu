package xyz.cbt.wenqu.backend.modules.kb.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import java.util.List;

@Mapper
public interface KnowledgeBaseMapper {
    Long findKnowledgeBaseOwner(@Param("kbId") long kbId);
    List<KnowledgeBaseListProjection> searchKnowledgeBases(@Param("keyword") String keyword,
            @Param("status") String status, @Param("ownerId") Long ownerId);
    List<DocumentListProjection> search(@Param("kbId") long kbId, @Param("keyword") String keyword,
                                        @Param("status") String status);
}
