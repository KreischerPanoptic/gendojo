import { Burger, Flex } from "@mantine/core";
import { IconBell } from "@tabler/icons-react";
import { /*useTheme, */useThemeStore } from "@stores/themeStore";
import { ToggleTheme } from "@ui/ToggleTheme";
// import { Logo } from "@components/ui/Logo";
import { useMenuOpened, useMenuToggle } from "@stores/navigationStore";
import type { HeaderProps } from "./types";
import { GetBorderStyles } from "@lib/utils/themeStyles";

export function Header({ className }: HeaderProps) {
    const opened = useMenuOpened();
    const toggle = useMenuToggle();
    // const theme = useTheme();
    const isDark = useThemeStore((state) => state.theme === "dark");

    const borderClass = GetBorderStyles(isDark);

    const iconBellClass = isDark
        ? "stroke-white hover:fill-white hover:stroke-white"
        : "stroke-black hover:fill-black hover:stroke-black"

    return (
        <Flex
            className={`${className} ${borderClass}`}
            justify="space-between"
            align="center"
            mih={60}
        >

            <div className="min-w-10">
                <Burger
                    opened={opened}
                    onClick={toggle}
                    size="sm"
                    lineSize={1}
                    aria-label="Toggle navigation"
                />
            </div>

            <span>GenDojo</span>

            {/* <Logo type="header" theme={theme} /> */}

            <Flex
                gap={{ base: "20", lg: "30", xl: "40" }}
                align="center"
            >

                {/* <SearchInput className="hidden! lg:flex!" /> */}
                <ToggleTheme />
                <IconBell
                    className={iconBellClass}
                    size={24}
                    stroke={2}
                    cursor="pointer"
                />
                {/* <UserAvatar {...userAvatarProps} className="hidden! lg:flex!" /> */}

            </Flex>

        </Flex>
    )
}