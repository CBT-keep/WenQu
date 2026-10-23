package xyz.cbt.wenqu.backend.modules.model.vo;

public record ModelOptionVO(
    Long id, 
    String name, 
    String type, 
    Boolean isDefault) {
}
