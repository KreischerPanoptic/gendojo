import { create } from "zustand";
import type { Theme } from "@lib/types/theme";

interface ThemeState {
    theme: Theme,

    // Actions
    setTheme: (theme: Theme) => void;
    toggleTheme: () => void;
    initialize: () => void;
    isDark: () => boolean;
};

const THEME_STORAGE_KEY = "app-theme";

// Get system theme
const getSystemTheme = (): Theme => {
    if (typeof window === "undefined") {
        return "light";
    }

    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
};

export const useThemeStore = create<ThemeState>((set, get) => ({
    theme: "light",

    initialize: () => {
        // Check if user has saved theme preference
        const savedTheme = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;

        if (savedTheme) {
            get().setTheme(savedTheme);
        } else {
            // Load system theme on first visit
            const systemTheme = getSystemTheme();
            get().setTheme(systemTheme);
        }
    },

    setTheme: (theme: Theme) => {
        localStorage.setItem(THEME_STORAGE_KEY, theme);
        document.documentElement.setAttribute("data-mantine-color-scheme", theme);
        set({ theme });
    },

    toggleTheme: () => {
        const currTheme = get().theme;
        const newTheme = currTheme === "dark" ? "light" : "dark";
        get().setTheme(newTheme);
    },

    isDark: () => get().theme === "dark",
}));

export const useInitTheme = () => useThemeStore((state) => state.initialize);
export const useToggleTheme = () => useThemeStore((state) => state.toggleTheme);
export const useTheme = () => useThemeStore((state) => state.theme);
export const useIsDarkTheme = () => useThemeStore((state) => state.isDark);