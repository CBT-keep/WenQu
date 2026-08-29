package com.xia.wenqu.service.extractor;

import org.apache.tika.Tika;
import org.apache.tika.exception.TikaException;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

/**
 * 统一文本解析器
 */
@Component
public class TikaExtractor implements TextExtractor {

    private final Tika tika = new Tika();

    // 只有纯文本格式可以兜底用原生读取
    private static final Set<String> TEXT_FORMATS = Set.of("txt", "md");

    @Override
    public String extract(Path filePath) throws IOException, TikaException {
        try (InputStream is = Files.newInputStream(filePath)) {
            String text = tika.parseToString(is);
            if (text != null && !text.isBlank()) {
                return text;
            }
        }
        // 纯文本格式兜底用原生读取，二进制格式直接报错
        String fileName = filePath.getFileName().toString();
        String ext = fileName.contains(".") ? fileName.substring(fileName.lastIndexOf(".") + 1).toLowerCase() : "";
        if (TEXT_FORMATS.contains(ext)) {
            return Files.readString(filePath, StandardCharsets.UTF_8);
        }
        throw new IOException("Tika 解析结果为空: " + fileName);
    }

    @Override
    public boolean supports(String ext) {
        return Set.of("pdf", "doc", "docx", "xls", "xlsx",
                "ppt", "pptx", "txt", "md", "html",
                "csv", "epub").contains(ext);
    }
}