package xyz.cbt.wenqu.backend.modules.kb.mapper;

import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

import java.util.Optional;


@Mapper
public interface KbReferenceMapper {

    Optional<LlmModelProjection> findModelById(@Param("id") Long id);

    String findSettingValue(@Param("key") String key);
}
