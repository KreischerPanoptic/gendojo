import { useForm } from '@mantine/form'
import { Stack, TextInput, Group, Button } from '@mantine/core'
import { IconFolder, IconCheck, IconX } from '@tabler/icons-react'
import { useState } from 'react'
import SettingsSection from './SettingsSection'
import type { Data } from '@generated/data'
import { notifications } from '@mantine/notifications'
import { client } from '~/client'

export default function PathsSection(paths: Data.Setting['paths']) {
  const [isSaving, setIsSaving] = useState(false)

  // Align the form keys exactly with the DB/Props to make saving a direct pass-through
  const form = useForm({
    initialValues: {
      modelsPath: paths.modelsPath ?? '',
      datasetsPath: paths.datasetsPath ?? '',
      outputsPath: paths.outputsPath ?? '',
      logsPath: paths.logsPath ?? '',
      sdScriptsPath: paths.sdScriptsPath ?? '',
    },
  })

  const handleSave = async () => {
    setIsSaving(true)
    try {
      await client.api.settings.paths.update({ body: form.values })
      notifications.show({
        title: 'Paths saved',
        message: 'Your workspace paths have been updated successfully.',
        color: 'green',
        icon: <IconCheck size={16} />,
      })
      form.resetDirty()
    } catch (error) {
      console.error('Failed to save paths:', error)
      notifications.show({
        title: 'Save failed',
        message: 'There was a problem saving your paths. Please try again.',
        color: 'red',
        icon: <IconX size={16} />,
      })
    } finally {
      setIsSaving(false)
    }
  }

  const pathFields: Array<{
    key: keyof typeof form.values
    label: string
    description: string
  }> = [
    {
      key: 'modelsPath',
      label: 'Models path',
      description: 'Root directory for all model files (checkpoints, LoRAs, VAEs…)',
    },
    {
      key: 'datasetsPath',
      label: 'Datasets path',
      description: 'Root directory for training datasets',
    },
    {
      key: 'outputsPath',
      label: 'Outputs path',
      description: 'Destination for trained LoRA/checkpoint files',
    },
    {
      key: 'logsPath',
      label: 'Logs path',
      description: 'Root for job logs and TensorBoard event files',
    },
    {
      key: 'sdScriptsPath',
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
      <form onSubmit={form.onSubmit(handleSave)}>
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
              type="submit"
              size="xs"
              variant="filled"
              color="orange"
              leftSection={<IconCheck size={12} />}
              loading={isSaving}
              disabled={!form.isDirty()}
            >
              Save paths
            </Button>
          </Group>
        </Stack>
      </form>
    </SettingsSection>
  )
}
