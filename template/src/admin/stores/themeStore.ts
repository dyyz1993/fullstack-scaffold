import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type ThemeMode = 'light' | 'dark'

interface ThemeState {
  mode: ThemeMode
  toggleTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'light' as ThemeMode,
      toggleTheme: () => {
        const newMode = get().mode === 'light' ? 'dark' : 'light'
        document.documentElement.setAttribute('data-theme', newMode)
        set({ mode: newMode })
      },
    }),
    {
      name: 'admin-theme',
      onRehydrateStorage: () => {
        return state => {
          if (state) {
            document.documentElement.setAttribute('data-theme', state.mode)
          }
        }
      },
    }
  )
)
