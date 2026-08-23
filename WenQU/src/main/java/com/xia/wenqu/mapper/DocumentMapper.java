package com.xia.wenqu.mapper;

import com.xia.wenqu.model.entity.Document;
import org.apache.ibatis.annotations.Mapper;

/**
 * @author hbk
 * @version 1.0
 * @date 2026/8/23 16:13
 */
@Mapper
public interface DocumentMapper {
    /**
     * 插入文档数据
     */
    int insert(Document doc);
}
