package xyz.cbt.wenqu.backend.modules.auth.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateProfileDTO {
    @Size(max = 64, message = "昵称最长 64 字")
    private String nickname;
    @Email(message = "邮箱格式不正确")
    @Size(max = 128, message = "邮箱最长 128 字")
    private String email;
}
