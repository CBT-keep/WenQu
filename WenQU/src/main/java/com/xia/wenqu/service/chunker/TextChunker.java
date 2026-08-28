package com.xia.wenqu.service.chunker;

import java.util.List;

/**
 * 切分器抽象接口
 *
 * @author hbk
 * @version 1.0
 * @date 2026/8/28 10:45
 */
public interface TextChunker {
    List<String> chunk(String text, int chunkSize, int overlap);
}
