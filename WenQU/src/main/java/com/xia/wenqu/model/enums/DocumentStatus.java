package com.xia.wenqu.model.enums;

import lombok.Getter;

@Getter
public enum DocumentStatus {

    UPLOADED,
    UPLOADING,
    PARSING,
    CHUNKING,
    EMBEDDING,
    READY,
    FAILED;

    public boolean isReady() {
        return this == READY;
    }
}
