import "@mantine/dropzone/styles.css";

import {
  ActionIcon,
  Box,
  Button,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { type FileWithPath } from "@mantine/dropzone";
import { IconArrowLeft, IconUpload } from "@tabler/icons-react";
import {
  useUploadDatasetFiles,
  useUploadDatasetZip,
  type UploadDatasetResponse,
} from "@services/datasets";
import { useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { UploadDatasetForm } from "@forms/dataset/upload/UploadForm";
import { SuccessView } from "@ui/SuccessView";

// ─────────────────────────────────────────────────────────────────────────────

const NAME_REGEX = /^[a-zA-Z0-9][a-zA-Z0-9._-]*$/;

function validateName(name: string): string | null {
  if (!name.trim()) return "Name is required";
  if (!NAME_REGEX.test(name))
    return "Only letters, numbers, hyphens, underscores and dots allowed";
  if (name.includes("..")) return "Name cannot contain ..";
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// UploadDatasetPage
// ─────────────────────────────────────────────────────────────────────────────

export default function UploadDatasetPage() {
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [nameError, setNameError] = useState<string | null>(null);
  const [mode, setMode] = useState<"zip" | "files">("zip");
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [imageFiles, setImageFiles] = useState<FileWithPath[]>([]);
  const [result, setResult] = useState<UploadDatasetResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const zipMutation = useUploadDatasetZip();
  const filesMutation = useUploadDatasetFiles();

  const isUploading =
    zipMutation.uploadState.isUploading || filesMutation.uploadState.isUploading;
  const progress =
    mode === "zip"
      ? zipMutation.uploadState.progress
      : filesMutation.uploadState.progress;

  const canUpload =
    !validateName(name) &&
    (mode === "zip" ? zipFile !== null : imageFiles.length > 0);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleNameChange = (value: string) => {
    setName(value);
    if (nameError) setNameError(validateName(value));
  };

  const handleModeChange = (value: "zip" | "files") => {
    setMode(value);
    setUploadError(null);
  };

  const handleImageDrop = (incoming: FileWithPath[]) => {
    setImageFiles((prev) => {
      const existing = new Set(prev.map((f) => f.name));
      return [...prev, ...incoming.filter((f) => !existing.has(f.name))];
    });
  };

  const handleUpload = async () => {
    const err = validateName(name);
    if (err) { setNameError(err); return; }
    setUploadError(null);
    try {
      if (mode === "zip" && zipFile) {
        const res = await zipMutation.mutateAsync({ name: name.trim(), file: zipFile });
        setResult(res);
      } else if (mode === "files" && imageFiles.length > 0) {
        const res = await filesMutation.mutateAsync({ name: name.trim(), files: imageFiles });
        setResult(res);
      }
    } catch (e) {
      setUploadError(e instanceof Error ? e.message : "Upload failed");
    }
  };

  const handleReset = () => {
    setResult(null);
    setZipFile(null);
    setImageFiles([]);
    setUploadError(null);
    setName("");
    setNameError(null);
    zipMutation.resetProgress();
    filesMutation.resetProgress();
  };

  // ── Success ────────────────────────────────────────────────────────────────

  if (result) {
    return (
      <SuccessView
        result={result}
        onView={() => navigate({ to: "/datasets/view/" + result.name })}
        onUploadAnother={handleReset}
      />
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────

  return (
    <Stack gap={0} h="100%" style={{ overflow: "hidden" }}>

      {/* Header */}
      <Box
        p="lg"
        pb="md"
        style={{ borderBottom: "1px solid var(--mantine-color-default-border)" }}
      >
        <Group justify="space-between" align="center">
          <Group gap="md" align="center">
            <ActionIcon
              variant="subtle"
              onClick={() => navigate({ to: "/datasets" })}
              size="sm"
              disabled={isUploading}
            >
              <IconArrowLeft size={15} />
            </ActionIcon>
            <Stack gap={2}>
              <Title order={3}>Upload Dataset</Title>
              <Text size="xs" c="dimmed">
                Create a new training dataset from a ZIP archive or individual files
              </Text>
            </Stack>
          </Group>

          <Group gap="xs">
            <Button
              variant="subtle"
              color="gray"
              onClick={() => navigate({ to: "/datasets" })}
              disabled={isUploading}
              size="sm"
            >
              Cancel
            </Button>
            <Button
              leftSection={<IconUpload size={15} />}
              disabled={!canUpload || isUploading}
              loading={isUploading}
              onClick={() => void handleUpload()}
            >
              {mode === "zip"
                ? "Upload & Extract"
                : imageFiles.length > 0
                  ? `Upload ${imageFiles.length} File${imageFiles.length > 1 ? "s" : ""}`
                  : "Upload Files"}
            </Button>
          </Group>
        </Group>
      </Box>

      {/* Body */}
      <Box
        style={{ flex: 1, overflowY: "auto", display: "flex", alignSelf: "center" }}
        p="lg"
      >
        <UploadDatasetForm
          name={name}
          nameError={nameError}
          mode={mode}
          zipFile={zipFile}
          imageFiles={imageFiles}
          uploadError={uploadError}
          isUploading={isUploading}
          progress={progress}
          onNameChange={handleNameChange}
          onNameBlur={() => setNameError(validateName(name))}
          onModeChange={handleModeChange}
          onZipDrop={setZipFile}
          onZipClear={() => setZipFile(null)}
          onImageDrop={handleImageDrop}
          onImageClear={() => setImageFiles([])}
        />
      </Box>

    </Stack>
  );
}