package xyz.cbt.wenqu.backend.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import xyz.cbt.wenqu.backend.enumeration.AuthResultCode;
import xyz.cbt.wenqu.backend.modules.dto.LoginDTO;
import xyz.cbt.wenqu.backend.modules.vo.LoginVO;
import xyz.cbt.wenqu.backend.result.Result;
import xyz.cbt.wenqu.backend.service.AuthService;

@RestController
@Slf4j
@RequiredArgsConstructor
@RequestMapping("/api/v1/auth")
public class authController {
    private final AuthService authService;

    @PostMapping("/login")
    public Result<LoginVO> login(@Valid @RequestBody LoginDTO loginDTO){
        log.info("用户正在登录，登录信息：{}", loginDTO);
        LoginVO loginVO = authService.login(loginDTO);
        return Result.success(AuthResultCode.SUCCESS,loginVO);
    }

}
