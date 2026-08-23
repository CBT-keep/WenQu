package com.xia.wenqu.service;

import com.xia.wenqu.common.PageResult;
import com.xia.wenqu.model.vo.DocumentVO;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;

/**
 * 文档功能接口类
 *
 * @author hbk
 * @version 1.0
 * @date 2026/8/23 15:09
 */
public interface DocumentService {
    /**
     * 文件上传
     */
    DocumentVO upload(Long kbId, MultipartFile file, Long userId) throws IOException;

    /**
     * 文章列表查询
     */
    PageResult<DocumentVO> pageQuery(Long kbId, int page, int pageSize);
}
