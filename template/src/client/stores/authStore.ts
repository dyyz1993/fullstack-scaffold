import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface UserProfile {
  id: string
  username: string
  role: string
}

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  user: UserProfile | null

  setAuth: (token: string, user: UserProfile) => void
  setToken: (token: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      token: null,
      isAuthenticated: false,
      user: null,

      setAuth: (token: string, user: UserProfile) =>
        set({
          token,
          isAuthenticated: true,
          user,
        }),

      setToken: (token: string) =>
        set({
          token,
          isAuthenticated: true,
        }),

      logout: () =>
        set({
          token: null,
          isAuthenticated: false,
          user: null,
        }),
    }),
    {
      name: 'auth-token',
    }
  )
)
