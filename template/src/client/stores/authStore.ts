import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AuthUser {
  id: string
  username: string
  email?: string
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean

  setToken: (token: string) => void
  setUser: (user: AuthUser) => void
  login: (token: string, user: AuthUser) => void
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

      setUser: (user: AuthUser) => set({ user }),

      login: (token: string, user: AuthUser) =>
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
