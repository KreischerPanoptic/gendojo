import { useState } from 'react'
import type { Data } from '@generated/data'
import { Stack, NumberInput, Group, Button } from '@mantine/core'
import { IconServer, IconCheck, IconX } from '@tabler/icons-react'
import SettingsSection from './SettingsSection'
import { useForm } from '@mantine/form'
import { notifications } from '@mantine/notifications'
import { client } from '~/client'

export function TrainingSection({
  maxConcurrentJobs,
  logBufferSize,
  cpuThreadsPerProcess,
}: Data.Setting['training']) {
  const [isSaving, setIsSaving] = useState(false)

  // Align the form keys exactly with the DB/Props to make saving a direct pass-through
  const form = useForm({
    initialValues: {
      maxConcurrentJobs: maxConcurrentJobs ?? 1,
      logBufferSize: logBufferSize ?? 2000,
      cpuThreadsPerProcess: cpuThreadsPerProcess ?? 2,
    },
  })

  const trainingFields: Array<{
    key: keyof typeof form.values
    label: string
    description: string
    min: number
    max: number
    step?: number
  }> = [
    {
      key: 'maxConcurrentJobs',
      label: 'Max concurrent jobs',
      description: 'RunPod single-GPU pods should keep this at 1',
      min: 1,
      max: 8,
    },
    {
      key: 'logBufferSize',
      label: 'Log buffer size',
      description: 'Number of log lines kept in memory per job for replay on reconnect',
      min: 100,
      max: 10000,
      step: 100,
    },
    {
      key: 'cpuThreadsPerProcess',
      label: 'CPU threads per process',
      description: 'Passed as --num_cpu_threads_per_process to accelerate launch',
      min: 1,
      max: 32,
    },
  ]

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await client.api.settings.training.update({ body: form.values })
      notifications.show({
        title: 'Training settings saved',
        message: 'Your training settings have been updated successfully.',
        color: 'green',
        icon: <IconCheck size={16} />,
      })
      form.resetDirty()
    } catch (error) {
      console.error('Failed to save training settings:', error)
      notifications.show({
        title: 'Save failed',
        message: 'There was a problem saving your training settings. Please try again.',
        color: 'red',
        icon: <IconX size={16} />,
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <SettingsSection
      icon={<IconServer size={16} />}
      title="Training"
      description="Job scheduler and log buffer settings"
    >
      <form onSubmit={form.onSubmit(handleSave)}>
        <Stack gap="xs">
          {trainingFields.map(({ key, label, description, max, min, step }) => (
            <NumberInput
              key={key}
              label={label}
              description={description}
              min={min}
              max={max}
              step={step}
              size="xs"
              styles={{ description: { marginBottom: 2 } }}
              {...form.getInputProps(key)}
            />
          ))}
          <Group justify="flex-end" mt="xs">
            <Button
              type="submit"
              size="xs"
              variant="filled"
              color="orange"
              leftSection={<IconCheck size={12} />}
              loading={isSaving}
              disabled={!form.isDirty()}
            >
              Save training
            </Button>
          </Group>
        </Stack>
      </form>
    </SettingsSection>
  )
}
