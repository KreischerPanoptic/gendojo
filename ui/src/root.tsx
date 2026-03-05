import { useEffect } from "react";
import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { useThemeStore } from "@stores/themeStore";
import App from "./App";
import { ModalsProvider } from "@mantine/modals";
import { ContextMenuProvider } from "mantine-contextmenu";

// ─────────────────────────────────────────────────────────────────────────────
// Mantine theme — dark forge aesthetic
// ─────────────────────────────────────────────────────────────────────────────

const theme = createTheme({
  primaryColor: "orange",
  primaryShade: { dark: 6 },
  fontFamily: "Outfit, sans-serif",
  fontFamilyMonospace: "JetBrains Mono, monospace",
  defaultRadius: "sm",
  focusRing: "auto",

  components: {
    NavLink: {
      styles: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
          fontSize: "0.875rem",
        },
      },
    },
    Card: {
      defaultProps: { withBorder: true },
      styles: {
        root: {
          background: "var(--gd-panel)",
          borderColor: "var(--gd-border)",
        },
      },
    },
    AppShell: {
      styles: {
        main: { background: "var(--gd-bg)" },
        navbar: {
          background: "var(--gd-surface)",
          borderColor: "var(--gd-border)",
        },
        header: {
          background: "var(--gd-surface)",
          borderColor: "var(--gd-border)",
        },
      },
    },
  },
});

// ─────────────────────────────────────────────────────────────────────────────

export function Root() {
  const theme_value = useThemeStore((s) => s.theme);
  const initTheme = useThemeStore((s) => s.initialize);

  useEffect(() => {
    initTheme();
  }, [initTheme]);

  return (
    <MantineProvider theme={theme} defaultColorScheme={theme_value}>
      <Notifications position="top-right" zIndex={1000} />
      <ModalsProvider>
        <ContextMenuProvider>
          <App />
        </ContextMenuProvider>
      </ModalsProvider>
    </MantineProvider>
  );
}
