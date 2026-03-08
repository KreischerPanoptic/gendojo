import {
  Alert,
  Group,
  Progress,
  SegmentedControl,
  Stack,
  Text,
  TextInput,
} from "@mantine/core";
import { type FileWithPath } from "@mantine/dropzone";
import { IconAlertCircle, IconPackage } from "@tabler/icons-react";
import { FilesDropzone } from "@ui/FilesDropzone";
import { ZipDropzone } from "@ui/ZipDropzone";

// ─────────────────────────────────────────────────────────────────────────────
// Props
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadDatasetFormProps {
  // State
  name: string;
  nameError: string | null;
  mode: "zip" | "files";
  zipFile: File | null;
  imageFiles: FileWithPath[];
  uploadError: string | null;
  isUploading: boolean;
  progress: number;
  // Handlers
  onNameChange: (value: string) => void;
  onNameBlur: () => void;
  onModeChange: (value: "zip" | "files") => void;
  onZipDrop: (file: File) => void;
  onZipClear: () => void;
  onImageDrop: (files: FileWithPath[]) => void;
  onImageClear: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// UploadDatasetForm
// ─────────────────────────────────────────────────────────────────────────────

export function UploadDatasetForm({
  name,
  nameError,
  mode,
  zipFile,
  imageFiles,
  uploadError,
  isUploading,
  progress,
  onNameChange,
  onNameBlur,
  onModeChange,
  onZipDrop,
  onZipClear,
  onImageDrop,
  onImageClear,
}: UploadDatasetFormProps) {
  return (
    <Stack gap="lg" maw={560}>

      {/* Dataset name */}
      <TextInput
        label="Dataset name"
        description="Used as the folder name on disk. Letters, numbers, hyphens, underscores."
        placeholder="my_character_v1"
        value={name}
        onChange={(e) => onNameChange(e.currentTarget.value)}
        onBlur={onNameBlur}
        error={nameError}
        disabled={isUploading}
        leftSection={<IconPackage size={15} />}
        styles={{
          input: { fontFamily: "var(--mantine-font-family-monospace)" },
        }}
      />

      {/* Method toggle */}
      <Stack gap="xs">
        <Text size="sm" fw={500}>
          Upload method
        </Text>
        <SegmentedControl
          value={mode}
          onChange={(v) => onModeChange(v as "zip" | "files")}
          disabled={isUploading}
          data={[
            { label: "ZIP Archive", value: "zip" },
            { label: "Individual Files", value: "files" },
          ]}
        />
        <Text size="xs" c="dimmed">
          {mode === "zip"
            ? "Best for large datasets. Images and captions extracted automatically."
            : "Upload images and optional .txt captions directly. Up to 50 files at a time."}
        </Text>
      </Stack>

      {/* Dropzone */}
      {mode === "zip" ? (
        <ZipDropzone
          file={zipFile}
          onDrop={onZipDrop}
          onClear={onZipClear}
          disabled={isUploading}
        />
      ) : (
        <FilesDropzone
          files={imageFiles}
          onDrop={onImageDrop}
          onClear={onImageClear}
          disabled={isUploading}
        />
      )}

      {/* Progress */}
      {isUploading && (
        <Stack gap={6}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Uploading…</Text>
            <Text size="xs" fw={500}>{progress}%</Text>
          </Group>
          <Progress value={progress} color="orange" animated radius="xl" size="sm" />
        </Stack>
      )}

      {/* Error */}
      {uploadError && (
        <Alert
          color="red"
          icon={<IconAlertCircle size={16} />}
          title="Upload failed"
          radius="md"
        >
          {uploadError}
        </Alert>
      )}

    </Stack>
  );
}