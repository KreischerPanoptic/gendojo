import { create } from "zustand";

interface NavigationState {
    opened: boolean;
    toggle: () => void;
    open: () => void;
    close: () => void;
};

export const useNavigationStore = create<NavigationState>((set) => ({
    opened: false,

    toggle: () => set((state) => ({ opened: !state.opened })),
    open: () => set({ opened: true }),
    close: () => set({ opened: false })
}));

export const useMenuOpened = () => useNavigationStore((state) => state.opened);
export const useMenuToggle = () => useNavigationStore((state) => state.toggle);
export const useMenuOpen = () => useNavigationStore((state) => state.open);
export const useMenuClose = () => useNavigationStore((state) => state.close);