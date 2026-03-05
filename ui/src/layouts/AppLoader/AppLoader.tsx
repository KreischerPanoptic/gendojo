import { Center, Loader, Stack, Text } from '@mantine/core'
import { useThemeStore } from '@stores/themeStore'
// import { Logo } from '@components/ui/Logo'
// import { useTheme } from '@stores/themeStore'

export function AppLoader() {
  // const theme = useTheme()
  const isDark = useThemeStore((s) => s.theme === 'dark')

  return (
    <Center
      className={`
        fixed inset-0 z-[9999]
        transition-colors duration-300
        ${isDark ? 'bg-[#141414]' : 'bg-[#f8f9fa]'}
      `}
    >
      <Stack align="center" gap="xl">
        {/* Logo fades in */}
        <div
          style={{
            animation: 'fadeSlideIn 0.5s ease-out forwards',
            opacity: 0,
          }}
        >
          GenDojo
          {/* <Logo type="header" theme={theme} /> */}
        </div>

        {/* Loader + text fade in slightly later */}
        <Stack
          align="center"
          gap="sm"
          style={{
            animation: 'fadeSlideIn 0.5s ease-out 0.15s forwards',
            opacity: 0,
          }}
        >
          <Loader size="sm" type="dots" />
          <Text size="sm" c="dimmed">
            Завантаження...
          </Text>
        </Stack>
      </Stack>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes fadeSlideIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </Center>
  )
}