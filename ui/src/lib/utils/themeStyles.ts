function GetHoverStyles(isDark: boolean = true): string {
    return isDark
        ? "hover:bg-white/10! active:bg-white/20!"
        : "hover:bg-black/10! active:bg-black/20!";
}

function GetHoverShadowStyles(isDark: boolean = true): string {
    return isDark
        ? "hover:shadow-[0_0_0_5px_rgba(255,255,255,0.1)]"
        : "hover:shadow-[0_0_0_5px_rgba(0,0,0,0.1)]";
}

function GetBorderStyles(isDark: boolean = true): string {
    return isDark
        ? "border-(--mantine-color-gray-7)"
        : "border-(--mantine-color-gray-7)/10";
}

export {
    GetHoverStyles,
    GetHoverShadowStyles,
    GetBorderStyles,
};