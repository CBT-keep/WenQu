package xyz.cbt.wenqu.backend.modules.user.vo;

import xyz.cbt.wenqu.backend.modules.auth.vo.UserVO;

/**
 * 创建用户结果：新用户对象 + 一次性随机初始密码
 * tempPassword 仅在未指定密码（服务端随机生成）时非空，明文只此一次，前端要请管理员抄走
 */
public record UserCreateVO(UserVO user, String tempPassword) {
}
