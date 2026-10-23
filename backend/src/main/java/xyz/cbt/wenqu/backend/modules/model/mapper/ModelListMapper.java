package xyz.cbt.wenqu.backend.modules.model.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.List;

@Mapper
public interface ModelListMapper {
    /**
     * 查询模型列表
     */
    List<ModelListProjection> search(@Param("type") String type, @Param("enabled") Boolean enabled);
}
