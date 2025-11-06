import { create } from 'zustand'

type ThemeMode = 'light' | 'dark'

interface ThemeStoreState {
  mode: ThemeMode
  toggleTheme: () => void
  setMode: (mode: ThemeMode) => void
}

const getInitialMode = (): ThemeMode => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('theme-mode')
    if (saved === 'dark' || saved === 'light') {
      return saved
    }
    // Проверяем системные настройки
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark'
    }
  }
  return 'light'
}

export const useThemeStore = create<ThemeStoreState>((set) => ({
  mode: getInitialMode(),
  toggleTheme: () =>
    set((state) => {
      const newMode = state.mode === 'light' ? 'dark' : 'light'
      if (typeof window !== 'undefined') {
        localStorage.setItem('theme-mode', newMode)
      }
      return { mode: newMode }
    }),
  setMode: (mode) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('theme-mode', mode)
    }
    set({ mode })
  },
}))

