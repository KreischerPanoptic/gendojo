import type { Theme } from "@lib/types/theme";

type LogoType = "header" | "footer";

export interface LogoProps {
    type?: LogoType;
    theme?: Theme;
};