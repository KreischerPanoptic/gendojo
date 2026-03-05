import { useThemeStore } from "@stores/themeStore";
import { IconSun, IconMoon } from "@tabler/icons-react";

export function ToggleTheme() {
    const themeStore = useThemeStore();

    return (
        <>
            {themeStore.isDark()
                ? <IconSun
                    onClick={themeStore.toggleTheme}
                    className="hover:fill-white hover:stroke-white"
                    size={24}
                    stroke={2}
                    color="white"
                    cursor="pointer"
                />

                : <IconMoon
                    onClick={themeStore.toggleTheme}
                    className="hover:fill-black hover:stroke-black"
                    size={24}
                    stroke={2}
                    color="black"
                    cursor="pointer"
                />
            }
        </>
    )
}