package xyz.cbt.wenqu.backend.modules.models.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import xyz.cbt.wenqu.backend.modules.models.entity.LlmModel;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Mapper
public interface ModelsMapper {
    List<LlmModel> search(@Param("type") String type, @Param("enabled") Boolean enabled);

    /**
     * 名称重复校验
     */
    long countByName(@Param("name") String name);

    /**
     * 同类型默认模型校验
     */
    long countDefaultByType(@Param("type") String type);

    /**
     * 新增模型，回填自增 id
     */
    int insert(LlmModel model);

    Optional<LlmModel> findById(@Param("id") Long id);

    int deleteById(@Param("id") Long id);

    long KbRefByModelId(@Param("id") Long id);

    long countChatConvRefByModelId(@Param("id") Long id);
}
