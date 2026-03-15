import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Divider,
  Group,
  NumberInput,
  PasswordInput,
  Stack,
  Text,
  TextInput,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core'
import { useForm } from '@mantine/form'
import {
  IconAlertCircle,
  IconCheck,
  IconFolder,
  IconKey,
  IconMoon,
  IconServer,
  IconSettings,
  IconSun,
  IconTrash,
} from '@tabler/icons-react'
import { useThemeStore } from '@stores/themeStore'
import { useSettings, useUpdateSettings } from '@services/settings'
import { useTokens, useUpdateTokens, useClearToken } from '@services/tokens'
import { useState } from 'react'
import type { UpdateSettingsDto } from '@services/settings'

// ─────────────────────────────────────────────────────────────────────────────
// Section wrapper
// ─────────────────────────────────────────────────────────────────────────────

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode
  title: string
  description?: string
  children: React.ReactNode
}) {
  return (
    <Box>
      <Group gap="sm" mb="xs">
        <ThemeIcon size={32} variant="light" color="orange" radius="md">
          {icon}
        </ThemeIcon>
        <Stack gap={0}>
          <Text fw={600} size="sm">
            {title}
          </Text>
          {description && (
            <Text size="xs" c="dimmed">
              {description}
            </Text>
          )}
        </Stack>
      </Group>
      <Box ml={44}>{children}</Box>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Appearance section
// ─────────────────────────────────────────────────────────────────────────────

function AppearanceSection() {
  const { data: settings } = useSettings()
  const tmpTheme = settings?.theme ?? 'auto'
  const serverTheme = tmpTheme === 'auto' ? 
    window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' : tmpTheme

  const updateSettings = useUpdateSettings()

  const { setTheme } = useThemeStore();
  const isDark = serverTheme === 'dark'

  const updateTheme = async (theme: 'dark' | 'light') => {
    setTheme(theme);
    const dto: UpdateSettingsDto = {
      theme
    }
    await updateSettings.mutateAsync(dto).catch(() => null)
  }

  return (
    <SettingsSection
      icon={<IconSun size={16} />}
      title="Appearance"
      description="Interface theme preference"
    >
      <Group gap="sm" align="center">
        <Button
          variant={isDark ? 'filled' : 'outline'}
          size="xs"
          leftSection={<IconMoon size={14} />}
          onClick={async () => !isDark && await updateTheme('dark')}
          color="dark"
        >
          Dark
        </Button>
        <Button
          variant={!isDark ? 'filled' : 'outline'}
          size="xs"
          leftSection={<IconSun size={14} />}
          onClick={async () => isDark && await updateTheme('light')}
          color="orange"
        >
          Light
        </Button>
        <Text size="xs" c="dimmed">
          Current: <strong>{isDark ? 'Dark' : 'Light'}</strong>
        </Text>
      </Group>
    </SettingsSection>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Token row
// ─────────────────────────────────────────────────────────────────────────────

function TokenRow({
  label,
  description,
  hint,
  isSet,
  tokenKey,
  onSave,
  onClear,
  saving,
  clearing,
}: {
  label: string
  description: string
  hint: string | null
  isSet: boolean
  tokenKey: 'hfToken' | 'civitaiToken'
  onSave: (key: 'hfToken' | 'civitaiToken', value: string) => void
  onClear: (key: 'hfToken' | 'civitaiToken') => void
  saving: boolean
  clearing: boolean
}) {
  const [value, setValue] = useState('')

  const handleSave = () => {
    if (value.trim()) {
      onSave(tokenKey, value.trim())
      setValue('')
    }
  }

  return (
    <Box>
      <Group gap="xs" mb={6}>
        <Text size="sm" fw={500}>
          {label}
        </Text>
        {isSet ? (
          <Badge size="xs" color="teal" variant="light">
            Set {hint ? `(${hint})` : ''}
          </Badge>
        ) : (
          <Badge size="xs" color="gray" variant="light">
            Not set
          </Badge>
        )}
      </Group>
      <Text size="xs" c="dimmed" mb="xs">
        {description}
      </Text>
      <Group gap="xs" align="flex-end">
        <PasswordInput
          placeholder={isSet ? 'Enter new token to replace…' : 'Paste token…'}
          value={value}
          onChange={(e) => setValue(e.currentTarget.value)}
          style={{ flex: 1 }}
          size="xs"
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
        />
        <Button
          size="xs"
          variant="filled"
          color="orange"
          disabled={!value.trim()}
          loading={saving}
          onClick={handleSave}
          leftSection={<IconCheck size={12} />}
        >
          Save
        </Button>
        {isSet && (
          <Tooltip label={`Clear ${label}`} withArrow>
            <ActionIcon
              size="sm"
              variant="subtle"
              color="red"
              loading={clearing}
              onClick={() => onClear(tokenKey)}
            >
              <IconTrash size={13} />
            </ActionIcon>
          </Tooltip>
        )}
      </Group>
    </Box>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Tokens section
// ─────────────────────────────────────────────────────────────────────────────

function TokensSection() {
  const { data: tokens, isError } = useTokens()
  const updateTokens = useUpdateTokens()
  const clearToken = useClearToken()

  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [clearingKey, setClearingKey] = useState<string | null>(null)

  const handleSave = async (key: 'hfToken' | 'civitaiToken', value: string) => {
    setSavingKey(key)
    await updateTokens.mutateAsync({ [key]: value }).catch(() => null)
    setSavingKey(null)
  }

  const handleClear = async (key: 'hfToken' | 'civitaiToken') => {
    setClearingKey(key)
    await clearToken.mutateAsync(key).catch(() => null)
    setClearingKey(null)
  }

  if (isError) {
    return (
      <Alert
        color="red"
        icon={<IconAlertCircle size={14} />}
        title="Failed to load token status"
        radius="md"
        py="xs"
      />
    )
  }

  return (
    <SettingsSection
      icon={<IconKey size={16} />}
      title="API Tokens"
      description="Credentials for model downloads — stored on disk, never logged"
    >
      <Stack gap="md">
        <TokenRow
          label="HuggingFace Token"
          description="Required to download gated models (e.g. FLUX.1-dev). Get yours at huggingface.co/settings/tokens"
          hint={tokens?.hfToken.hint ?? null}
          isSet={tokens?.hfToken.set ?? false}
          tokenKey="hfToken"
          onSave={handleSave}
          onClear={handleClear}
          saving={savingKey === 'hfToken'}
          clearing={clearingKey === 'hfToken'}
        />
        <Divider />
        <TokenRow
          label="CivitAI Token"
          description="Required to download models from CivitAI. Get yours at civitai.com/user/account"
          hint={tokens?.civitaiToken.hint ?? null}
          isSet={tokens?.civitaiToken.set ?? false}
          tokenKey="civitaiToken"
          onSave={handleSave}
          onClear={handleClear}
          saving={savingKey === 'civitaiToken'}
          clearing={clearingKey === 'civitaiToken'}
        />
      </Stack>
    </SettingsSection>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Paths section
// ─────────────────────────────────────────────────────────────────────────────

function PathsSection() {
  const { data: settings, isLoading, isError } = useSettings()
  const updateSettings = useUpdateSettings()

  const form = useForm({
    initialValues: {
      models: settings?.modelsPath ?? '',
      datasets: settings?.datasetsPath ?? '',
      outputs: settings?.outputsPath?? '',
      logs: settings?.logsPath ?? '',
      sdScripts: settings?.sdScriptsPath ?? '',
    },
    // Sync when data loads
    enhanceGetInputProps: () => ({ disabled: isLoading }),
  })

  // Sync form when settings load
  const [synced, setSynced] = useState(false)
  if (settings && !synced) {
    form.setValues({
      models: settings.modelsPath,
      datasets: settings.datasetsPath,
      outputs: settings.outputsPath,
      logs: settings.logsPath,
      sdScripts: settings.sdScriptsPath,
    })
    setSynced(true)
  }

  const handleSave = async () => {
    const dto: UpdateSettingsDto = { paths: form.values }
    await updateSettings.mutateAsync(dto).catch(() => null)
  }

  if (isError) {
    return (
      <Alert
        color="red"
        icon={<IconAlertCircle size={14} />}
        title="Failed to load settings"
        radius="md"
        py="xs"
      />
    )
  }

  const pathFields: Array<{
    key: keyof typeof form.values
    label: string
    description: string
  }> = [
    {
      key: 'models',
      label: 'Models path',
      description: 'Root directory for all model files (checkpoints, LoRAs, VAEs…)',
    },
    {
      key: 'datasets',
      label: 'Datasets path',
      description: 'Root directory for training datasets',
    },
    {
      key: 'outputs',
      label: 'Outputs path',
      description: 'Destination for trained LoRA/checkpoint files',
    },
    {
      key: 'logs',
      label: 'Logs path',
      description: 'Root for job logs and TensorBoard event files',
    },
    {
      key: 'sdScripts',
      label: 'sd-scripts path',
      description: 'Path to the kohya-ss/sd-scripts directory',
    },
  ]

  return (
    <SettingsSection
      icon={<IconFolder size={16} />}
      title="Paths"
      description="Workspace volume locations on the pod"
    >
      <Stack gap="xs">
        {pathFields.map(({ key, label, description }) => (
          <TextInput
            key={key}
            label={label}
            description={description}
            size="xs"
            styles={{ description: { marginBottom: 2 } }}
            {...form.getInputProps(key)}
          />
        ))}
        <Group justify="flex-end" mt="xs">
          <Button
            size="xs"
            variant="filled"
            color="orange"
            leftSection={<IconCheck size={12} />}
            loading={updateSettings.isPending}
            onClick={handleSave}
          >
            Save paths
          </Button>
        </Group>
      </Stack>
    </SettingsSection>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// Training section
// ─────────────────────────────────────────────────────────────────────────────

function TrainingSection() {
  const { data: settings, isError } = useSettings()
  const updateSettings = useUpdateSettings()

  const form = useForm({
    initialValues: {
      maxConcurrentJobs: settings?.maxConcurrentJobs ?? 1,
      logBufferSize: settings?.logBufferSize ?? 2000,
      cpuThreadsPerProcess: settings?.cpuThreadsPerProcess ?? 2,
    },
  })

  const [synced, setSynced] = useState(false)
  if (settings && !synced) {
    form.setValues({
      maxConcurrentJobs: settings.maxConcurrentJobs,
      logBufferSize: settings.logBufferSize,
      cpuThreadsPerProcess: settings.cpuThreadsPerProcess,
    })
    setSynced(true)
  }

  const handleSave = async () => {
    const dto: UpdateSettingsDto = {
      training: {
        maxConcurrentJobs: form.values.maxConcurrentJobs,
        logBufferSize: form.values.logBufferSize,
        cpuThreadsPerProcess: form.values.cpuThreadsPerProcess,
      },
    }
    await updateSettings.mutateAsync(dto).catch(() => null)
  }

  if (isError) return null

  return (
    <SettingsSection
      icon={<IconServer size={16} />}
      title="Training"
      description="Job scheduler and log buffer settings"
    >
      <Stack gap="xs">
        <NumberInput
          label="Max concurrent jobs"
          description="RunPod single-GPU pods should keep this at 1"
          min={1}
          max={8}
          size="xs"
          styles={{ description: { marginBottom: 2 } }}
          {...form.getInputProps('maxConcurrentJobs')}
        />
        <NumberInput
          label="Log buffer size"
          description="Number of log lines kept in memory per job for replay on reconnect"
          min={100}
          max={10000}
          step={100}
          size="xs"
          styles={{ description: { marginBottom: 2 } }}
          {...form.getInputProps('logBufferSize')}
        />
        <NumberInput
          label="CPU threads per process"
          description="Passed as --num_cpu_threads_per_process to accelerate launch"
          min={1}
          max={32}
          size="xs"
          styles={{ description: { marginBottom: 2 } }}
          {...form.getInputProps('cpuThreadsPerProcess')}
        />
        <Group justify="flex-end" mt="xs">
          <Button
            size="xs"
            variant="filled"
            color="orange"
            leftSection={<IconCheck size={12} />}
            loading={updateSettings.isPending}
            onClick={handleSave}
          >
            Save training
          </Button>
        </Group>
      </Stack>
    </SettingsSection>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// SettingsPage
// ─────────────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  return (
    <Stack gap={0} h="100%" style={{ overflow: 'hidden' }}>
      {/* Header */}
      <Box
        p="lg"
        pb="md"
        style={{ borderBottom: '1px solid var(--mantine-color-default-border)', flexShrink: 0 }}
      >
        <Group gap="sm" align="center">
          <ThemeIcon size={28} variant="transparent" color="orange">
            <IconSettings size={20} />
          </ThemeIcon>
          <Title order={3}>Settings</Title>
        </Group>
      </Box>

      {/* Content */}
      <Box p="lg" style={{ overflowY: 'auto', flex: 1 }}>
        <Stack gap="xl" maw={640}>
          <AppearanceSection />
          <Divider />
          <TokensSection />
          <Divider />
          <PathsSection />
          <Divider />
          <TrainingSection />
        </Stack>
      </Box>
    </Stack>
  )
}