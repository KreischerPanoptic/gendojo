import { create } from 'zustand'

interface NavigationState {
  opened: boolean
  toggle: () => void
  open: () => void
  close: () => void
}

export const useNavigationStore = create<NavigationState>((set) => ({
  opened: false,
  toggle: () => set((state) => ({ opened: !state.opened })),
  open: () => set({ opened: true }),
  close: () => set({ opened: false }),
}))

export const useMenuOpened = () => useNavigationStore((s) => s.opened)
export const useMenuToggle = () => useNavigationStore((s) => s.toggle)
export const useMenuOpen = () => useNavigationStore((s) => s.open)
export const useMenuClose = () => useNavigationStore((s) => s.close)
