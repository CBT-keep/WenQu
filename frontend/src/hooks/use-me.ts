import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchMe } from '@/api/auth'
import { isAuthenticated } from '@/lib/token'
import { useAuthStore } from '@/stores/auth'

/**
 * 当前登录用户，**以服务端 /auth/me 为准**。
 *
 * 为什么不能只信 zustand：store 只在内存里，硬刷新就没了；而
 * `mustChangePassword` 是"能不能进业务界面"的判据 —— 只信内存等于刷新一下就能绕过门禁。
 *
 * 为什么不能回退到 store 里的 user 兜底：那份 user 可能是更早一次 /auth/me 的结果，
 * 一旦服务端状态变了（比如刚改完密），拿旧值判断就会把用户误拦在门外。
 * 这里只在拿到服务端结果后才返回数据，宁可多转一下圈，也不拿旧值做决定。
 */
export function useMe() {
  const setUser = useAuthStore((s) => s.setUser)

  const query = useQuery({
    queryKey: ['me'],
    queryFn: fetchMe,
    enabled: isAuthenticated(),
    // 门禁要的是"当下是否必须改密"，缓存只是省一次往返：改密/登录两条路径都会主动写入，
    // 30s 是给其它进程改数据留的自愈窗口
    staleTime: 30_000,
    retry: 0,
  })

  // 结果回填 store：侧栏问候语 / 头像 / 角色显隐都读它（仅展示用途）
  useEffect(() => {
    if (query.data) setUser(query.data)
  }, [query.data, setUser])

  return {
    me: query.data ?? null,
    /** 已登录但还没拿到结果 */
    isPending: isAuthenticated() && !query.data && !query.error,
    /** 手上这份数据已过期（改密后自愈窗口内会是 false） */
    isStale: !!query.data && query.isStale,
    error: query.error,
    refetch: query.refetch,
  }
}
