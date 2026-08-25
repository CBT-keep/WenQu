package com.xia.wenqu.service.extractor;

import java.io.IOException;
import java.nio.file.Path;

/**
 * 文件解析器接口
 *
 * @author hbk
 * @version 1.0
 * @date 2026/8/25 09:20
 */
public interface TextExtractor {

    // 输入文件路径，输出文件里的文字
    String extract(Path filePath) throws IOException;

    // 支持的格式
    boolean supports(String ext);
}
