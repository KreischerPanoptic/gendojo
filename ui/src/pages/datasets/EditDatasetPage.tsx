import {
  ActionIcon,
  Alert,
  Badge,
  Box,
  Button,
  Group,
  RingProgress,
  ScrollArea,
  SimpleGrid,
  Skeleton,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from "@mantine/core";
import { Split } from "@gfazioli/mantine-split-pane";
import {
  IconAlertCircle,
  IconArrowLeft,
  IconPhoto,
  IconPlus,
  IconUpload,
} from "@tabler/icons-react";
import { useDataset } from "@services/datasets";
import { useNavigate, useParams } from "@tanstack/react-router";
import { Route } from "@routes/_authenticated/datasets/edit/$datasetName";
import { useCallback, useEffect, useState } from "react";
import { AddFilesDrawer } from "@blocks/AddFilesDrawer";
import { CaptionEditor } from "@ui/CaptionEditor";
import { DatasetImageGrid } from "@layouts/DatasetImageGrid";

// ─────────────────────────────────────────────────────────────────────────────
// EditDatasetPage
// ─────────────────────────────────────────────────────────────────────────────

export default function EditDatasetPage() {
  const navigate = useNavigate();
  const { datasetName } = useParams({
    from: "/_authenticated/datasets/edit/$datasetName",
  });
  const { data: dataset, isLoading, isError } = useDataset(datasetName);
  const { filename: initialFilename } = Route.useSearch();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [addFilesOpen, setAddFilesOpen] = useState(false);

  // When dataset loads, jump to the image that was passed via search param
  useEffect(() => {
    if (!dataset || !initialFilename) return;
    const idx = dataset.images.findIndex(
      (img) => img.filename === initialFilename,
    );
    if (idx !== -1) setSelectedIndex(idx);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dataset?.name, initialFilename]); // run once when dataset first arrives

  useEffect(() => {
    if (dataset && selectedIndex >= dataset.images.length) {
      setSelectedIndex(Math.max(0, dataset.images.length - 1));
    }
  }, [dataset, selectedIndex]);

  const selectedImage = dataset?.images[selectedIndex] ?? null;

  const handleKeyboard = useCallback(
    (e: KeyboardEvent) => {
      if (!dataset) return;
      if (e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowRight" || e.key === "ArrowDown")
        setSelectedIndex((i) => Math.min(i + 1, dataset.images.length - 1));
      else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
        setSelectedIndex((i) => Math.max(i - 1, 0));
    },
    [dataset],
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboard);
    return () => window.removeEventListener("keydown", handleKeyboard);
  }, [handleKeyboard]);

  // ── Loading / error states ─────────────────────────────────────────────────

  if (isLoading) {
    return (
      <Stack gap="lg" p="lg">
        <Skeleton height={28} width={200} radius="md" />
        <SimpleGrid cols={{ base: 3, sm: 5, md: 6, lg: 8 }} spacing="xs">
          {Array.from({ length: 16 }).map((_, i) => (
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
      <AddFilesDrawer
        datasetName={datasetName}
        opened={addFilesOpen}
        onClose={() => setAddFilesOpen(false)}
      />

      <Stack gap={0} h="100%" style={{ overflow: "hidden" }}>
        {/* Header */}
        <Box
          p="lg"
          pb="md"
          style={{
            borderBottom: "1px solid var(--mantine-color-default-border)",
            flexShrink: 0,
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
                    {captionPercent}%
                  </Text>
                  <Text size="xs" c="dimmed">
                    captioned
                  </Text>
                </Stack>
              </Group>
              <Button
                variant="outline"
                size="sm"
                leftSection={<IconPlus size={14} />}
                onClick={() => setAddFilesOpen(true)}
              >
                Add files
              </Button>
            </Group>
          </Group>
        </Box>

        {/* Body */}
        {dataset.imageCount === 0 ? (
          <Stack align="center" justify="center" flex={1} gap="md" p="xl">
            <ThemeIcon size={64} variant="light" color="gray" radius="xl">
              <IconPhoto size={32} />
            </ThemeIcon>
            <Stack gap={4} align="center">
              <Text fw={500}>No images yet</Text>
              <Text size="sm" c="dimmed">
                Upload some images to get started
              </Text>
            </Stack>
            <Button
              leftSection={<IconUpload size={14} />}
              onClick={() => setAddFilesOpen(true)}
            >
              Add files
            </Button>
          </Stack>
        ) : (
          // ── Split pane layout ──────────────────────────────────────────────
          <Split
            w="100%"
            style={{ flex: 1, minHeight: 0 }}
            color="var(--mantine-color-default-border)"
            hoverColor="var(--mantine-color-orange-5)"
            size="xs"
          >
            {/* Left pane — image grid */}
            <Split.Pane grow style={{ height: "100%", minWidth: 0 }}>
              <DatasetImageGrid
                images={dataset.images}
                datasetName={datasetName}
                onImageClick={setSelectedIndex}
                selectedIndex={selectedIndex}
                scrollAreaStyle={{ height: "100%" }}
              />
            </Split.Pane>

            <Split.Resizer />

            {/* Right pane — caption editor */}
            {selectedImage && (
              <Split.Pane
                initialWidth={320}
                minWidth={240}
                maxWidth={520}
                style={{ height: "100%" }}
              >
                <ScrollArea style={{ height: "100%" }} p="md">
                  <CaptionEditor
                    key={selectedImage.filename}
                    image={selectedImage}
                    datasetName={datasetName}
                    onNavigatePrev={
                      selectedIndex > 0
                        ? () => setSelectedIndex((i) => i - 1)
                        : null
                    }
                    onNavigateNext={
                      selectedIndex < dataset.images.length - 1
                        ? () => setSelectedIndex((i) => i + 1)
                        : null
                    }
                    currentIndex={selectedIndex}
                    total={dataset.images.length}
                  />
                </ScrollArea>
              </Split.Pane>
            )}
          </Split>
        )}
      </Stack>
    </>
  );
}
