package xyz.cbt.wenqu.backend.service.impl;

import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import xyz.cbt.wenqu.backend.enumeration.AuthResultCode;
import xyz.cbt.wenqu.backend.exception.BusinessException;
import xyz.cbt.wenqu.backend.mapper.UserMapper;
import xyz.cbt.wenqu.backend.modules.dto.LoginDTO;
import xyz.cbt.wenqu.backend.modules.entity.SysUser;
import xyz.cbt.wenqu.backend.modules.vo.LoginVO;
import xyz.cbt.wenqu.backend.modules.vo.UserVO;
import xyz.cbt.wenqu.backend.service.AuthService;
import xyz.cbt.wenqu.backend.utils.JwtUtil;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final UserMapper userMapper;
    private final AuthenticationManager authenticationManager;
    private final JwtUtil jwtUtil;
    /**
     * 用户登录
     * @param loginDTO
     * @return
     */
    @Override
    public LoginVO login(LoginDTO loginDTO) {
        //ss认证
        UsernamePasswordAuthenticationToken usernamePasswordAuthenticationToken = new UsernamePasswordAuthenticationToken(loginDTO.getUsername(), loginDTO.getPassword());
        Authentication authentication = authenticationManager.authenticate(usernamePasswordAuthenticationToken);
        //签发JWT
        return issueToken(authentication.getName());
    }

    /**
     * 签发token
     * @param username
     * @return
     */
    private LoginVO issueToken(String username) {
        SysUser sysUser = userMapper.selectByUsername(username);
        if (sysUser == null){
            throw new BusinessException(AuthResultCode.BAD_CREDENTIALS);
        }
        if (sysUser.getStatus().equals("DISABLED")) {
            throw new BusinessException(AuthResultCode.ACCOUNT_DISABLED);
        }
        //签发token
        String accessToken = jwtUtil.generateToken(sysUser.getUsername(), sysUser.getId(), JwtUtil.TYPE_ACCESS);
        String refreshToken = jwtUtil.generateToken(sysUser.getUsername(), sysUser.getId(), JwtUtil.TYPE_REFRESH);
        return LoginVO.builder()
                .tokenType("Bearer")
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .expiresIn(jwtUtil.getAccessExpiration())
                //todo:少设置了一个rt时间
                .mustChangePassword(sysUser.isMustChangePassword())
                .user(
                        UserVO.builder()
                                .id(sysUser.getId())
                                .username(sysUser.getUsername())
                                .nickname(sysUser.getNickname())
                                .role(sysUser.getRole())
                                .status(sysUser.getStatus())
                                .build()
                )
                .build();
    }
}
