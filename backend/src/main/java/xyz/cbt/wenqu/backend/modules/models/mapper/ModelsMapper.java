package xyz.cbt.wenqu.backend.modules.models.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import xyz.cbt.wenqu.backend.modules.models.entity.LlmModel;

import java.util.Arrays;
import java.util.List;

@Mapper
public interface ModelsMapper {
    List<LlmModel> search(@Param("type") String type, @Param("enabled") Boolean enabled);
}
