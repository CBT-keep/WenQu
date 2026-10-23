package xyz.cbt.wenqu.backend.common;

import java.util.List;

/**
 * 分页响应体：
 * { page, size, total, pages, records }
 */
public record PageResult<T>(long page, long size, long total, long pages, List<T> records) {

    public static <T> PageResult<T> of(long page, long size, long total, List<T> records) {
        long pages = size > 0 ? (total + size - 1) / size : 0;
        return new PageResult<>(page, size, total, pages, records);
    }
}
