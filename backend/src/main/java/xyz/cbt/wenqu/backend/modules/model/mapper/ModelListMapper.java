package xyz.cbt.wenqu.backend.modules.model.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import xyz.cbt.wenqu.backend.modules.model.entity.Model;

import java.util.List;

@Mapper
public interface ModelListMapper {
    /**
     * 查询模型列表
     */
    List<ModelListProjection> search(@Param("type") String type, @Param("enabled") Boolean enabled);

    /**
     * 根据id查找
     */
    Model selectById(@Param("id") Long id);

    long countByName(@Param("name") String name);

    long countDefaultByType(@Param("type") String type);

    int insert(Model model);
}
