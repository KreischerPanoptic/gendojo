import {
  Badge,
  Button,
  Divider,
  Group,
  Kbd,
  Modal,
  ScrollArea,
  SimpleGrid,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import { IconLayoutColumns } from "@tabler/icons-react";
import { Compare } from "@gfazioli/mantine-compare";
import {
  ARCH_COLOR,
  ARCH_LABEL,
  type ModelArchitecture,
} from "@services/models";
import { outputsApi, type CheckpointPreview } from "@services/jobs/outputs";
import {
  LightboxSidePanel,
  type LightboxImage,
  type ImageDimensions,
} from "@ui/LightboxModal";
import type { CheckpointPreviewDto, SamplePromptDto } from "@api/types.gen";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SamplePrompt {
  index: number;
  prompt: string;
  negativePrompt?: string;
  seed?: number;
  width?: number;
  height?: number;
  steps?: number;
  cfg?: number;
}

export interface PreviewMeta {
  epoch?: number;
  step?: number;
  promptIndex: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Token helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Detects activation token prefix in prompt text.
 * Matches "@zoroj. rest" / "@zoroj, rest" / "zoroj. rest"
 * Returns { token, rest } or null if no recognisable token found.
 */
function parseActivationToken(
  prompt: string,
): { token: string; rest: string; sep: string } | null {
  const m = prompt.match(/^(@?[\w-]+)([.,])\s+(.+)$/s);
  if (!m) return null;
  const candidate = m[1];
  // Ignore common English article false-positives
  if (/^(a|the|an|this|that)$/i.test(candidate)) return null;
  return { token: candidate, sep: m[2], rest: m[3] };
}

/**
 * Find the "pair" of the current prompt — same base text but opposite token presence.
 */
function findPairPrompt(
  prompts: SamplePromptDto[],
  current: SamplePromptDto,
): SamplePromptDto | null {
  const parsed = parseActivationToken(current.prompt);
  const baseText = (parsed ? parsed.rest : current.prompt).trim();
  const hasToken = !!parsed;

  for (const p of prompts) {
    if (p.index === current.index) continue;
    const pParsed = parseActivationToken(p.prompt);
    const pBase = (pParsed ? pParsed.rest : p.prompt).trim();
    const pHasToken = !!pParsed;
    if (pBase === baseText && pHasToken !== hasToken) return p;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function ratioStr(w: number, h: number): string {
  if (!w || !h) return "—";
  const d = gcd(w, h);
  return `${w / d}:${h / d}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// StatCell
// ─────────────────────────────────────────────────────────────────────────────

function StatCell({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Stack gap={2}>
      <Text
        size="xs"
        c="dimmed"
        tt="uppercase"
        fw={600}
        style={{ letterSpacing: "0.06em", fontSize: "0.65rem" }}
      >
        {label}
      </Text>
      <Text size="sm" ff="monospace">
        {value ?? "—"}
      </Text>
    </Stack>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PromptText — token highlighted inline, rest of text normal
// ─────────────────────────────────────────────────────────────────────────────

function PromptText({ prompt }: { prompt: string }) {
  const parsed = parseActivationToken(prompt);

  if (!parsed) {
    return (
      <Text
        size="sm"
        style={{
          fontFamily: "var(--mantine-font-family-monospace)",
          fontSize: "0.78rem",
          lineHeight: 1.6,
          wordBreak: "break-word",
        }}
      >
        {prompt}
      </Text>
    );
  }

  return (
    <Text
      size="sm"
      style={{
        fontFamily: "var(--mantine-font-family-monospace)",
        fontSize: "0.78rem",
        lineHeight: 1.6,
        wordBreak: "break-word",
      }}
    >
      {/* Token highlighted in orange */}
      <Text
        component="span"
        style={{
          background: "var(--mantine-color-orange-light)",
          color: "var(--mantine-color-orange-light-color)",
          borderRadius: 4,
          padding: "1px 5px",
          fontWeight: 700,
          marginRight: 1,
        }}
      >
        {parsed.token}
      </Text>
      {/* Separator dimmed */}
      <Text component="span" c="dimmed">
        {parsed.sep}{" "}
      </Text>
      {/* Rest of prompt — normal */}
      {parsed.rest}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// CompareModal
// ─────────────────────────────────────────────────────────────────────────────

interface CompareModalProps {
  opened: boolean;
  onClose: () => void;
  urlWithToken: string;
  urlNoToken: string;
  tokenLabel: string; // e.g. "@zoroj"
  aspectRatio: string; // e.g. "832/1216"
}

function CompareModal({
  opened,
  onClose,
  urlWithToken,
  urlNoToken,
  tokenLabel,
  aspectRatio: ar,
}: CompareModalProps) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <IconLayoutColumns size={15} />
          <Text fw={600} size="sm">
            Token comparison
          </Text>
        </Group>
      }
      size="xl"
      centered
      radius="md"
      overlayProps={{ blur: 4, backgroundOpacity: 0.65 }}
    >
      <Stack gap="sm">
        {/* Side labels */}
        <Group justify="space-between" px={2}>
          <Badge
            variant="filled"
            color="orange"
            size="sm"
            style={{ letterSpacing: "0.02em" }}
          >
            ← {tokenLabel}
          </Badge>
          <Badge variant="light" color="gray" size="sm">
            no token →
          </Badge>
        </Group>

        {/* The slider */}
        <Compare
          leftSection={
            <img
              src={urlWithToken}
              alt="with token"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          }
          rightSection={
            <img
              src={urlNoToken}
              alt="without token"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                display: "block",
              }}
            />
          }
          aspectRatio={ar}
          variant="drag"
          defaultPosition={50}
          radius="md"
        />

        <Text size="xs" c="dimmed" ta="center">
          Drag the divider left/right to compare
        </Text>
      </Stack>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PreviewSidePanel props
// ─────────────────────────────────────────────────────────────────────────────

export interface PreviewSidePanelProps {
  image: LightboxImage;
  meta: PreviewMeta;
  prompt: SamplePromptDto;
  arch: ModelArchitecture;
  dimensions: ImageDimensions | null;
  onClose: () => void;
  jobId: string;
  checkpointPreviews: CheckpointPreview[];
  prompts: SamplePromptDto[];
}

// ─────────────────────────────────────────────────────────────────────────────
// PreviewSidePanel
// ─────────────────────────────────────────────────────────────────────────────

export function PreviewSidePanel({
  image,
  meta,
  prompt,
  arch,
  dimensions,
  onClose,
  jobId,
  checkpointPreviews,
  prompts,
}: PreviewSidePanelProps) {
  const [compareOpen, { open: openCompare, close: closeCompare }] =
    useDisclosure(false);

  // ── Token detection ────────────────────────────────────────────────────────
  const tokenParsed = parseActivationToken(prompt.prompt);
  const hasToken = !!tokenParsed;

  // ── Pair lookup ────────────────────────────────────────────────────────────
  const pairPrompt = findPairPrompt(prompts, prompt);
  const pairPreview =
    pairPrompt !== null
      ? checkpointPreviews.find((p) => p.promptIndex === pairPrompt.index)
      : null;
  const pairUrl = pairPreview
    ? outputsApi.getPreviewUrl(jobId, pairPreview.filename)
    : null;
  const canCompare = pairUrl !== null;

  // Always put token version on left, no-token on right
  const urlWithToken = hasToken ? image.url : (pairUrl ?? image.url);
  const urlNoToken = hasToken ? (pairUrl ?? image.url) : image.url;
  const tokenLabel = hasToken
    ? tokenParsed!.token
    : (parseActivationToken(pairPrompt?.prompt ?? "")?.token ?? "token");

  // Aspect ratio for Compare — actual dims preferred, fall back to prompt params
  const imgW = dimensions?.w ?? prompt.width ?? 1;
  const imgH = dimensions?.h ?? prompt.height ?? 1;
  const compareAR = `${imgW}/${imgH}`;

  // ── Footer ────────────────────────────────────────────────────────────────
  const footer = (
    <Stack gap="xs">
      {canCompare && (
        <Button
          size="xs"
          variant="light"
          color="blue"
          leftSection={<IconLayoutColumns size={13} />}
          fullWidth
          onClick={openCompare}
        >
          Compare with / without token
        </Button>
      )}
      <Group gap={4} justify="center">
        <Kbd size="xs">←</Kbd>
        <Kbd size="xs">→</Kbd>
        <Text size="xs" c="dimmed">
          navigate
        </Text>
        <Text size="xs" c="dimmed" mx={4}>
          ·
        </Text>
        <Kbd size="xs">Esc</Kbd>
        <Text size="xs" c="dimmed">
          close
        </Text>
      </Group>
    </Stack>
  );

  return (
    <>
      {canCompare && (
        <CompareModal
          opened={compareOpen}
          onClose={closeCompare}
          urlWithToken={urlWithToken}
          urlNoToken={urlNoToken}
          tokenLabel={tokenLabel}
          aspectRatio={compareAR}
        />
      )}

      <LightboxSidePanel image={image} onClose={onClose} footer={footer}>
        <Stack gap="md">
          {/* ── Arch + checkpoint info + token badge ─────────────────── */}
          <Group gap="xs" wrap="wrap">
            <Badge size="xs" variant="light" color={ARCH_COLOR[arch]}>
              {ARCH_LABEL[arch]}
            </Badge>
            {meta.epoch !== undefined && (
              <Badge size="xs" variant="outline" color="gray">
                epoch {meta.epoch}
              </Badge>
            )}
            {meta.step !== undefined && (
              <Badge size="xs" variant="outline" color="gray">
                step {meta.step.toLocaleString()}
              </Badge>
            )}
            {dimensions && (
              <Badge size="xs" variant="outline" color="gray">
                {dimensions.w}×{dimensions.h} ·{" "}
                {ratioStr(dimensions.w, dimensions.h)}
              </Badge>
            )}

            {/* Token presence badge */}
            <Tooltip
              label={
                hasToken
                  ? `Activation token "${tokenParsed!.token}" is present`
                  : canCompare
                    ? `No activation token — click Compare to see the difference vs. "${tokenLabel}"`
                    : "No activation token in this prompt"
              }
              withArrow
              multiline
              maw={220}
            >
              <Badge
                size="xs"
                variant="filled"
                color={hasToken ? "orange" : "gray"}
                style={{ cursor: canCompare ? "pointer" : "default" }}
                onClick={canCompare ? openCompare : undefined}
              >
                {hasToken ? tokenParsed!.token : "no token"}
              </Badge>
            </Tooltip>
          </Group>

          <Divider />

          {/* ── Prompt (token highlighted) ────────────────────────────── */}
          <Stack gap={6}>
            <Text
              size="xs"
              fw={600}
              c="dimmed"
              tt="uppercase"
              style={{ letterSpacing: "0.06em" }}
            >
              Prompt
            </Text>
            <ScrollArea.Autosize mah={140}>
              <PromptText prompt={prompt.prompt} />
            </ScrollArea.Autosize>
          </Stack>

          {/* ── Negative ──────────────────────────────────────────────── */}
          {prompt.negativePrompt && (
            <Stack gap={6}>
              <Text
                size="xs"
                fw={600}
                c="dimmed"
                tt="uppercase"
                style={{ letterSpacing: "0.06em" }}
              >
                Negative
              </Text>
              <ScrollArea.Autosize mah={80}>
                <Text
                  size="sm"
                  c="dimmed"
                  style={{
                    fontFamily: "var(--mantine-font-family-monospace)",
                    fontSize: "0.78rem",
                    lineHeight: 1.6,
                    wordBreak: "break-word",
                  }}
                >
                  {prompt.negativePrompt}
                </Text>
              </ScrollArea.Autosize>
            </Stack>
          )}

          <Divider />

          {/* ── Generation params ─────────────────────────────────────── */}
          <SimpleGrid cols={3} spacing="xs">
            <StatCell label="Seed" value={prompt.seed} />
            <StatCell label="Steps" value={prompt.steps} />
            <StatCell label="CFG" value={prompt.cfg} />
            <StatCell label="Width" value={prompt.width} />
            <StatCell label="Height" value={prompt.height} />
            <StatCell
              label="Ratio"
              value={
                prompt.width && prompt.height
                  ? ratioStr(prompt.width, prompt.height)
                  : undefined
              }
            />
          </SimpleGrid>
        </Stack>
      </LightboxSidePanel>
    </>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// makePreviewSidePanel factory
// ─────────────────────────────────────────────────────────────────────────────

export interface PreviewSidePanelFactoryOptions {
  metas: PreviewMeta[];
  prompts: SamplePromptDto[];
  arch: ModelArchitecture;
  onClose: () => void;
  jobId: string;
  checkpointPreviews: CheckpointPreviewDto[];
}

// eslint-disable-next-line react-refresh/only-export-components
export function makePreviewSidePanel({
  metas,
  prompts,
  arch,
  onClose,
  jobId,
  checkpointPreviews,
}: PreviewSidePanelFactoryOptions) {
  return (
    image: LightboxImage,
    index: number,
    dimensions: ImageDimensions | null,
  ) => {
    const meta = metas[index];
    const prompt = prompts[meta?.promptIndex ?? 0];
    if (!meta || !prompt) return null;

    return (
      <PreviewSidePanel
        key={image.filename}
        image={image}
        meta={meta}
        prompt={prompt}
        arch={arch}
        dimensions={dimensions}
        onClose={onClose}
        jobId={jobId}
        checkpointPreviews={checkpointPreviews}
        prompts={prompts}
      />
    );
  };
}
