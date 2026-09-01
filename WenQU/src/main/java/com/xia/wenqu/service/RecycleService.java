package com.xia.wenqu.service;

import com.xia.wenqu.model.vo.RecycleDocVO;
import com.xia.wenqu.model.vo.RecycleKbVO;

import java.util.List;

/**
 * 回收站：软删除的文档与知识库查询
 */
public interface RecycleService {

    /**
     * 当前用户所有软删除文档
     */
    List<RecycleDocVO> listDeletedDocuments(Long userId);

    /**
     * 当前用户所有软删除知识库
     */
    List<RecycleKbVO> listDeletedKnowledgeBases(Long userId);
}
