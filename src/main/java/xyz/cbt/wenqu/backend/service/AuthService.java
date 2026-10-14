package xyz.cbt.wenqu.backend.service;

import xyz.cbt.wenqu.backend.modules.dto.LoginDTO;
import xyz.cbt.wenqu.backend.modules.vo.LoginVO;

public interface AuthService {
    /**
     * 用户登录
     * @param loginDTO
     * @return
     */
    LoginVO login(LoginDTO loginDTO);
}
