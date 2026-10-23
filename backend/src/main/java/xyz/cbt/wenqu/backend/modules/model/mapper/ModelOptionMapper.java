package xyz.cbt.wenqu.backend.modules.model.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import xyz.cbt.wenqu.backend.modules.model.vo.ModelOptionVO;

import java.util.List;

@Mapper
public interface ModelOptionMapper {
    List<ModelOptionVO> findEnabled(@Param("type") String type);
}
