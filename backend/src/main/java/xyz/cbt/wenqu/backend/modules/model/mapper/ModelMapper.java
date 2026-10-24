package xyz.cbt.wenqu.backend.modules.model.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelOptionVO;

import java.util.List;

@Mapper
public interface ModelMapper {
    /**
     * 查询模型列表
     */
    List<ModelListProjection> search(@Param("type") String type, @Param("enabled") Boolean enabled);

    /**
     * 查询已启用模型的下拉选项
     */
    List<ModelOptionVO> findEnabled(@Param("type") String type);

    /**
     * 插入新模型，唯一约束冲突时返回 null
     */
    Long insert(ModelInsert model);

    /**
     * 名称唯一性检查；新增时 excludeId 为 null，编辑时排除当前模型
     */
    boolean nameExists(@Param("name") String name, @Param("excludeId") Long excludeId);

    /**
     * 同类型默认模型检查，可排除当前模型。
     */
    boolean defaultExists(@Param("type") String type, @Param("excludeId") Long excludeId);

    /**
     * 读取写入后的完整模型配置，不查询密钥。
     */
    ModelListProjection findById(@Param("id") long id);

    /**
     * 锁定模型，以供编辑或删除。
     */
    ModelListProjection findForUpdate(@Param("id") long id);

    int update(ModelUpdate model);

    int delete(@Param("id") long id);

    /**
     * 同类型默认标记的修改共用事务锁，事务结束时自动释放
     */
    void lockDefaultType(@Param("type") String type);

    int clearDefault(@Param("type") String type, @Param("excludeId") long excludeId);

    int setDefault(@Param("id") long id);

    /**
     * 统计知识库和会话的引用数量。
     */
    ModelReferenceCounts countReferences(@Param("id") long id);

    /**
     * 锁定绑定模型的知识库，防止索引状态被并发修改。
     */
    List<EmbeddingKnowledgeBaseProjection> lockEmbeddingKnowledgeBases(@Param("modelId") long modelId);

    int markEmbeddingIndexesStale(@Param("modelId") long modelId);
}
