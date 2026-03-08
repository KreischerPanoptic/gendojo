import { Stack, Box, Group, ThemeIcon, Title, Badge, Button, Text } from "@mantine/core";
import type { UploadDatasetResponse } from "@services/datasets";
import { IconCheck, IconEye, IconUpload } from "@tabler/icons-react";

// ─────────────────────────────────────────────────────────────────────────────
// SuccessView
// ─────────────────────────────────────────────────────────────────────────────

export interface SuccessViewProps {
  result: UploadDatasetResponse;
  onView: () => void;
  onUploadAnother: () => void;
}

export function SuccessView({ result, onView, onUploadAnother }: SuccessViewProps) {
  return (
    <Stack gap={0} h="100%" style={{ overflow: "hidden" }}>
      <Box
        p="lg"
        pb="md"
        style={{
          borderBottom: "1px solid var(--mantine-color-default-border)",
        }}
      >
        <Group gap="md" align="center">
          <ThemeIcon size={32} radius="xl" color="teal" variant="light">
            <IconCheck size={16} />
          </ThemeIcon>
          <Stack gap={2}>
            <Group gap="sm" align="center">
              <Title order={3}>Upload complete</Title>
              <Badge variant="light" color="teal" size="sm">
                {result.imageCount} images
              </Badge>
            </Group>
            <Text
              size="xs"
              c="dimmed"
              style={{ fontFamily: "var(--mantine-font-family-monospace)" }}
            >
              {result.name}
            </Text>
          </Stack>
        </Group>
      </Box>

      <Stack align="center" justify="center" flex={1} gap="xl" p="xl">
        <ThemeIcon size={72} radius="xl" color="teal" variant="light">
          <IconCheck size={36} />
        </ThemeIcon>
        <Stack gap={4} align="center">
          <Text fw={600} size="lg">
            Dataset <strong>{result.name}</strong> is ready
          </Text>
          <Text c="dimmed" size="sm">
            {result.imageCount} images extracted successfully
          </Text>
        </Stack>
        <Group>
          <Button leftSection={<IconEye size={15} />} onClick={onView}>
            View Dataset
          </Button>
          <Button
            variant="outline"
            leftSection={<IconUpload size={15} />}
            onClick={onUploadAnother}
          >
            Upload Another
          </Button>
        </Group>
      </Stack>
    </Stack>
  );
}