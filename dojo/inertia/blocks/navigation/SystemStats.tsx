import { Box, Flex, Tooltip, Text } from '@mantine/core'
import { IconAlertTriangle } from '@tabler/icons-react'
import { usePage, usePoll } from '@inertiajs/react'
import type { SystemSnapshot } from '#types/system'

export default function SystemStats({ expanded }: { expanded: boolean }) {
  usePoll(5000, { only: ['systemStats'] })

  const props = usePage().props
  const stats: SystemSnapshot = props.systemStats as SystemSnapshot

  if (import.meta.env.DEV && stats) {
    console.log('[SystemStats] snapshot shape:', JSON.stringify(Object.keys(stats)))
  }

  const color = (pct: number) =>
    pct >= 90
      ? 'var(--mantine-color-red-5)'
      : pct >= 70
        ? 'var(--mantine-color-yellow-5)'
        : 'var(--mantine-color-teal-5)'

  if (!stats) {
    return (
      <Tooltip label="System stats unavailable" position="right" withArrow disabled={expanded}>
        <Flex
          align="center"
          gap={6}
          px={expanded ? 'sm' : 0}
          justify={expanded ? 'flex-start' : 'center'}
          style={{ opacity: 0.4 }}
        >
          <IconAlertTriangle size={16} />
          {expanded && (
            <Text size="xs" style={{ fontFamily: 'var(--font-mono)', fontSize: '0.7rem' }}>
              unavailable
            </Text>
          )}
        </Flex>
      </Tooltip>
    )
  }

  const gpu = Array.isArray(stats.gpus) ? stats.gpus[0] : undefined

  if (!expanded) {
    const pct = gpu?.utilization.gpuPercent ?? 0
    return (
      <Tooltip
        label={
          gpu
            ? `GPU ${pct}% · ${(gpu.vram.usedMiB / 1024).toFixed(1)}/${(gpu.vram.totalMiB / 1024).toFixed(1)} GB · ${gpu.temperatureCelsius}°C`
            : 'No GPU'
        }
        position="right"
        withArrow
      >
        <Flex justify="center" align="center" style={{ height: 32 }}>
          <Box
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: gpu ? color(pct) : 'var(--mantine-color-gray-6)',
            }}
          />
        </Flex>
      </Tooltip>
    )
  }

  return (
    <Flex direction="column" gap={4} px="sm">
      <Text
        size="xs"
        style={{
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6rem',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--mantine-color-dimmed)',
        }}
      >
        system
      </Text>
      {gpu ? (
        <>
          <Flex justify="space-between">
            <Text
              size="xs"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: 'var(--mantine-color-dimmed)',
              }}
            >
              GPU
            </Text>
            <Text
              size="xs"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: color(gpu.utilization.gpuPercent),
              }}
            >
              {gpu.utilization.gpuPercent}%
            </Text>
          </Flex>
          <Flex justify="space-between">
            <Text
              size="xs"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: 'var(--mantine-color-dimmed)',
              }}
            >
              VRAM
            </Text>
            <Text
              size="xs"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: color((gpu.vram.usedMiB / gpu.vram.totalMiB) * 100),
              }}
            >
              {(gpu.vram.usedMiB / 1024).toFixed(1)}/{(gpu.vram.totalMiB / 1024).toFixed(0)} GB
            </Text>
          </Flex>
          <Flex justify="space-between">
            <Text
              size="xs"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                color: 'var(--mantine-color-dimmed)',
              }}
            >
              TEMP
            </Text>
            <Text
              size="xs"
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.72rem',
                fontWeight: 600,
                color: gpu.temperatureCelsius >= 85 ? 'var(--mantine-color-red-5)' : undefined,
              }}
            >
              {gpu.temperatureCelsius}°C
            </Text>
          </Flex>
        </>
      ) : (
        <Text
          size="xs"
          style={{
            fontFamily: 'var(--font-mono)',
            fontSize: '0.72rem',
            color: 'var(--mantine-color-dimmed)',
          }}
        >
          No GPU detected
        </Text>
      )}
    </Flex>
  )
}
