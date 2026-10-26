package xyz.cbt.wenqu.backend.modules.model.vo;

public record ModelTestVO(
    boolean success, 
    long latencyMs, 
    String modelName, 
    String echo, 
    String detail) {
}
