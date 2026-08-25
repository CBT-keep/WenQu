package com.xia.wenqu.service.chunker;

import java.util.ArrayList;
import java.util.List;

/**
 * 文本切分器
 *
 * @author hbk
 * @version 1.0
 * @date 2026/8/25 09:42
 */
public class TextChunker {

    /**
     * 长文本按固定大小切分若干段，相邻两段保留重叠字符
     */
    public static List<String> chunk(String text, int chunkSize, int overlap) {
        List<String> chunks = new ArrayList<>();
        if(text == null || text.isEmpty()) {
            return chunks;
        }

        int start = 0;
        while (start < text.length()) {
            int end = Math.min(start + chunkSize, text.length());
            chunks.add(text.substring(start, end));
            if (end == text.length()) {
                break;
            }
            start = end - overlap;
        }
        return chunks;
    }
}
