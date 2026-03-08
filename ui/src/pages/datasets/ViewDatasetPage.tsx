import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  RingProgress,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconEdit,
  IconPhoto,
} from "@tabler/icons-react";
import { useDataset } from "@services/datasets";
import { useNavigate, useParams } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { LightboxModal } from "@ui/LightboxModal";
import { DatasetImageGrid } from "@layouts/DatasetImageGrid";

// ─────────────────────────────────────────────────────────────────────────────
// ViewDatasetPage
// ─────────────────────────────────────────────────────────────────────────────

export default function ViewDatasetPage() {
  const navigate = useNavigate();
  const { datasetName } = useParams({
    from: "/_authenticated/datasets/view/$datasetName",
  });
  const { data: dataset, isLoading, isError } = useDataset(datasetName);

  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Keyboard: open lightbox with Enter on focused grid item, close with Escape
  const handleKeyboard = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxIndex !== null) setLightboxIndex(null);
    },
    [lightboxIndex],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [handleKeyboard]);

  // ── Loading / error ────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Stack gap="lg" p="lg">
        <Skeleton height={28} width={220} radius="md" />
        <SimpleGrid cols={{ base: 3, sm: 4, md: 5, lg: 6, xl: 8 }} spacing="xs">
          {Array.from({ length: 20 }).map((_, i) => (
            <Skeleton
              key={i}
              height={0}
              style={{ aspectRatio: "1", paddingBottom: "100%" }}
              radius="md"
            />
          ))}
        </SimpleGrid>
      </Stack>
    );
  }

  if (isError || !dataset) {
    return (
      <Stack gap="lg" p="lg" maw={480}>
        <Button
          variant="subtle"
          leftSection={<IconArrowLeft size={15} />}
          onClick={() => navigate({ to: "/datasets" })}
          px={4}
          size="sm"
        >
          Back to Datasets
        </Button>
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          title="Dataset not found"
          radius="md"
        >
          Could not load dataset <strong>{datasetName}</strong>.
        </Alert>
      </Stack>
    );
  }

  const captionPercent = Math.round(dataset.captionCoverage * 100);

  return (
    <>
      {/* Lightbox */}
      {lightboxIndex !== null && dataset.images.length > 0 && (
        <LightboxModal
          images={dataset.images}
          index={lightboxIndex}
          datasetName={datasetName}
          onClose={() => setLightboxIndex(null)}
          onNavigate={setLightboxIndex}
          onEdit={() => {
            const filename =
              lightboxIndex !== null
                ? dataset.images[lightboxIndex]?.filename
                : undefined;
            setLightboxIndex(null);
            navigate({
              to: "/datasets/edit/$datasetName",
              params: { datasetName },
              search: filename ? { filename } : { filename: undefined },
            });
          }}
        />
      )}

      <Stack gap={0} h="100%" style={{ overflow: "hidden" }}>
        {/* Header */}
        <Box
          p="lg"
          pb="md"
          style={{
            borderBottom: "1px solid var(--mantine-color-default-border)",
          }}
        >
          <Group justify="space-between" align="flex-start">
            <Group gap="md" align="center">
              <ActionIcon
                variant="subtle"
                onClick={() => navigate({ to: "/datasets" })}
                size="sm"
              >
                <IconArrowLeft size={15} />
              </ActionIcon>
              <Stack gap={2}>
                <Group gap="sm" align="center">
                  <Title order={3}>{dataset.name}</Title>
                  <Badge variant="light" color="gray" size="sm">
                    {dataset.imageCount} image
                    {dataset.imageCount !== 1 ? "s" : ""}
                  </Badge>
                  <Badge
                    variant="light"
                    color={captionPercent === 100 ? "teal" : "orange"}
                    size="sm"
                  >
                    {captionPercent}% captioned
                  </Badge>
                </Group>
                <Text
                  size="xs"
                  c="dimmed"
                  style={{ fontFamily: "var(--mantine-font-family-monospace)" }}
                >
                  {dataset.path}
                </Text>
              </Stack>
            </Group>

            <Group gap="md" align="center">
              <Group gap="xs" align="center">
                <RingProgress
                  size={40}
                  thickness={4}
                  roundCaps
                  sections={[
                    {
                      value: captionPercent,
                      color: captionPercent === 100 ? "teal" : "orange",
                    },
                  ]}
                />
                <Stack gap={0}>
                  <Text size="xs" fw={600}>
                    {dataset.captionedCount} / {dataset.imageCount}
                  </Text>
                  <Text size="xs" c="dimmed">
                    with captions
                  </Text>
                </Stack>
              </Group>
              <Button
                variant="light"
                size="sm"
                leftSection={<IconEdit size={14} />}
                onClick={() =>
                  navigate({ to: "/datasets/edit/" + datasetName })
                }
              >
                Edit captions
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Gallery */}
        {dataset.imageCount === 0 ? (
          <Stack align="center" justify="center" flex={1} gap="md" p="xl">
            <ThemeIcon size={64} variant="light" color="gray" radius="xl">
              <IconPhoto size={32} />
            </ThemeIcon>
            <Stack gap={4} align="center">
              <Text fw={500}>No images</Text>
              <Text size="sm" c="dimmed">
                This dataset is empty
              </Text>
            </Stack>
          </Stack>
        ) : (
          <DatasetImageGrid
            images={dataset.images}
            datasetName={datasetName}
            onImageClick={setLightboxIndex}
          />
        )}
      </Stack>
    </>
  );
}
