package com.xia.wenqu.service.chunker;

import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

/**
 * 句子切分器
 *
 * @author hbk
 * @version 1.0
 * @date 2026/8/28 10:46
 */
@Component
public class SentenceChunker implements TextChunker{

    // 中英文句末标点
    private static final Pattern SENTENCE_END = Pattern.compile(
            "(?<=[。！？.!?\\n])\\s*"
    );


    @Override
    public List<String> chunk(String text, int chunkSize, int overlap) {
        // 按段落拆
        String[] paragraphs = text.split("\\n\\s*\\n");

        // 按段落内句子拆
        List<String> sentence = new ArrayList<>();
        for(String para : paragraphs) {
            String[] sents = SENTENCE_END.split(para.trim());
            for(String s : sents) {
                if(!s.isBlank()) sentence.add(s.trim());
            }
        }

        // 合并
        List<String> chunks = new ArrayList<>();
        StringBuilder buf = new StringBuilder();
        for(String sent : sentence) {
            if(buf.length() + sent.length() > chunkSize && !buf.isEmpty()) {
                chunks.add(buf.toString().trim());
                // 取overlap字符作为下一块开头
                buf = new StringBuilder();
                if(overlap > 0) {
                    String prev = chunks.get(chunks.size() - 1);
                    int start = Math.max(0, prev.length() - overlap);
                    buf.append(prev.substring(start));
                }
            }
            if (!buf.isEmpty()) buf.append(" ");
            buf.append(sent);
        }
        if(!buf.isEmpty()) chunks.add(buf.toString().trim());

        // 超长句子兜底
        List<String> result = new ArrayList<>();
        for (String c : chunks) {
            if (c.length() > chunkSize) {
                result.addAll(fallbackSplit(c, chunkSize));
            } else {
                result.add(c);
            }
        }
        return result;
    }

    private List<String> fallbackSplit(String text, int chunkSize) {
        List<String> list = new ArrayList<>();
        for (int i = 0; i < text.length(); i += chunkSize) {
            list.add(text.substring(i, Math.min(i + chunkSize, text.length())));
        }
        return list;
    }
}
