import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface AuthUser {
  id: string
  username: string
  email?: string
  avatar?: string
  role?: 'user' | 'admin'
}

interface AuthState {
  token: string | null
  user: AuthUser | null
  isAuthenticated: boolean

  login: (token: string, user: AuthUser) => void
  logout: () => void
  updateUser: (user: Partial<AuthUser>) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    set => ({
      token: null,
      user: null,
      isAuthenticated: false,

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

      updateUser: (userData: Partial<AuthUser>) =>
        set(state => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),
    }),
    {
      name: 'auth-token',
      partialize: state => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

export function getAuthToken(): string | null {
  return useAuthStore.getState().token
}

export function getCurrentUser(): AuthUser | null {
  return useAuthStore.getState().user
}

export function isAuthenticated(): boolean {
  return useAuthStore.getState().isAuthenticated
}
