import { create } from 'zustand'
import type { TokenData, UserInfo } from '@/types/auth'
import { tokenStorage } from '@/lib/token'

interface AuthState {
  user: UserInfo | null
  mustChangePassword: boolean
  setSession: (data: TokenData) => void
  setUser: (user: UserInfo) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  mustChangePassword: false,
  setSession: (data) => {
    tokenStorage.setTokens(data.accessToken, data.refreshToken)
    set({ user: data.user ?? null, mustChangePassword: !!data.mustChangePassword })
  },
  setUser: (user) => set({ user }),
  clear: () => {
    tokenStorage.clear()
    set({ user: null, mustChangePassword: false })
  },
}))
