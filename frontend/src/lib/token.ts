const ACCESS_KEY = 'wq-access-token'
const REFRESH_KEY = 'wq-refresh-token'

/** localStorage 在隐私模式 / 禁用存储时会抛，全部兜住，不能让它打挂应用 */
function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}
function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* ignore */
  }
}
function safeRemove(key: string) {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

export const tokenStorage = {
  getAccessToken: () => safeGet(ACCESS_KEY),
  getRefreshToken: () => safeGet(REFRESH_KEY),
  setTokens(accessToken: string, refreshToken: string) {
    safeSet(ACCESS_KEY, accessToken)
    safeSet(REFRESH_KEY, refreshToken)
  },
  clear() {
    safeRemove(ACCESS_KEY)
    safeRemove(REFRESH_KEY)
  },
}

export const isAuthenticated = () => !!tokenStorage.getAccessToken()
