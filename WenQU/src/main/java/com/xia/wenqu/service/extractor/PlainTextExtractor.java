package com.xia.wenqu.service.extractor;

import org.springframework.stereotype.Component;

import java.io.File;
import java.io.IOException;
import java.nio.charset.Charset;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

/**
 * 文档解析器
 *
 * @author hbk
 * @version 1.0
 * @date 2026/8/25 09:23
 */
@Component
public class PlainTextExtractor implements TextExtractor{

    // 解析
    @Override
    public String extract(Path filePath) throws IOException {
        // 转换为字节数组
        byte[] bytes = Files.readAllBytes(filePath);

        // 尝试用 UTF-8 解码
        String text;
        try {
            text = new String(bytes, Charset.forName("UTF-8"));
        } catch (Exception e) {
            // 失败即用GBK
            text = new String(bytes, Charset.forName("GBK"));
        }

        // 除去BOM乱码字符
        if(!text.isEmpty() && text.charAt(0) == '\uFEFF') {
            text = text.substring(1);
        }

        return text;
    }

    // 判断是否支持
    @Override
    public boolean supports(String ext) {
        return Set.of("txt", "md").contains(ext);
    }
}
