import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUserResponse } from '@shared/modules/ops/schemas'

interface AuthState {
  token: string | null
  user: AuthUserResponse | null
  isAuthenticated: boolean

  setToken: (token: string) => void
  setUser: (user: AuthUserResponse) => void
  login: (token: string, user: AuthUserResponse) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      token: null,
      user: null,
      isAuthenticated: false,

      setToken: (token: string) =>
        set({
          token,
          isAuthenticated: true,
        }),

      setUser: (user: AuthUserResponse) => set({ user }),

      login: (token: string, user: AuthUserResponse) =>
        set({
          token,
          user,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          token: null,
          user: null,
          isAuthenticated: false,
        }),
    }),
    {
      name: 'auth-token',
    }
  )
)
