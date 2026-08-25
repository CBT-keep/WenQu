package com.xia.wenqu.service.extractor;

import com.xia.wenqu.common.ResultCode;
import com.xia.wenqu.common.exception.BusinessException;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * 解析分配器
 *
 * @author hbk
 * @version 1.0
 * @date 2026/8/25 09:30
 */
@Component
@RequiredArgsConstructor
public class TextExtractorFactory {
    // 将解析器放入一个列表里
    private final List<TextExtractor> extractors;

    /**
     * 根据后缀选择解析器
     */
    public TextExtractor get(String ext) {
        return extractors.stream()
                .filter(e -> e.supports(ext))
                .findFirst()
                .orElseThrow(() -> new BusinessException(ResultCode.UNSUPPORTED_FILE_TYPE));
    }
}
