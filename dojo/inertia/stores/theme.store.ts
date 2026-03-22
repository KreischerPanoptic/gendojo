import { create } from 'zustand'

export type Theme = 'light' | 'dark' | 'auto' // Added 'auto' to match your types

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  initialize: (serverTheme?: Theme) => void // Accept server theme here
  isDark: () => boolean
}

const THEME_KEY = 'gendojo-theme'

const getSystemTheme = (): Theme => {
  if (typeof window === 'undefined') return 'dark'
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: 'dark', // Default fallback

  initialize: (serverTheme?: Theme) => {
    let activeTheme: Theme = 'dark'

    if (serverTheme && serverTheme !== 'auto') {
      // 1. Prioritize the database setting if it's explicitly dark or light
      activeTheme = serverTheme
    } else {
      // 2. If 'auto' or undefined, check local storage or system preference
      const saved = localStorage.getItem(THEME_KEY) as Theme | null
      activeTheme = saved ?? getSystemTheme()
    }

    // Call setTheme to ensure Mantine data attributes are applied
    get().setTheme(activeTheme)
  },

  setTheme: (theme) => {
    localStorage.setItem(THEME_KEY, theme)
    // Mantine only accepts 'light' or 'dark' for the data attribute, so map 'auto'
    const finalMantineTheme = theme === 'auto' ? getSystemTheme() : theme
    document.documentElement.setAttribute('data-mantine-color-scheme', finalMantineTheme)

    set({ theme })
  },

  toggleTheme: () => {
    // If they toggle, they are explicitly choosing, so move away from 'auto'
    const isCurrentlyDark =
      get().theme === 'dark' || (get().theme === 'auto' && getSystemTheme() === 'dark')
    get().setTheme(isCurrentlyDark ? 'light' : 'dark')
  },

  isDark: () => {
    const current = get().theme
    return current === 'auto' ? getSystemTheme() === 'dark' : current === 'dark'
  },
}))

export const useInitTheme = () => useThemeStore((s) => s.initialize)
export const useToggleTheme = () => useThemeStore((s) => s.toggleTheme)
export const useTheme = () => useThemeStore((s) => s.theme)
export const useIsDarkTheme = () => useThemeStore((s) => s.isDark)
