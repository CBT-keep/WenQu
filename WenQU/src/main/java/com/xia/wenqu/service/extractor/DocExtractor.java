package com.xia.wenqu.service.extractor;

import org.apache.poi.xwpf.extractor.XWPFWordExtractor;
import org.apache.poi.xwpf.usermodel.XWPFDocument;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.io.InputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;

/**
 * docx文本解析器
 */
@Component
public class DocExtractor implements TextExtractor{
    @Override
    public String extract(Path filePath) throws IOException {
        try(InputStream is = Files.newInputStream(filePath);
            XWPFDocument docx = new XWPFDocument(is)) {
            XWPFWordExtractor extractor = new XWPFWordExtractor(docx);
            return extractor.getText();
        }
    }

    @Override
    public boolean supports(String ext) {
        return Set.of("docx").contains(ext);
    }
}
