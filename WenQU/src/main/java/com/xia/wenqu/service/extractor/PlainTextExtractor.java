package com.xia.wenqu.service.extractor;

import com.ibm.icu.text.CharsetDetector;
import com.ibm.icu.text.CharsetMatch;
import org.springframework.stereotype.Component;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

/**
 * 纯文本解析器
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

        // 使用ICUJ自动检测编码
        CharsetDetector charsetDetector = new CharsetDetector();
        charsetDetector.setText(new ByteArrayInputStream(bytes));
        CharsetMatch match = charsetDetector.detect();

        if(match != null) {
            return match.getString();
        }

        // 兜底使用UTF-8
        return new String(bytes, StandardCharsets.UTF_8);
    }

    // 判断是否支持
    @Override
    public boolean supports(String ext) {
        return Set.of("txt", "md").contains(ext);
    }
}
