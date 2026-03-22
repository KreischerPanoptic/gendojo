import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Code,
  CopyButton,
  Group,
  Indicator,
  Modal,
  Paper,
  ScrollArea,
  Stack,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import {
  IconAlertTriangle,
  IconArrowDown,
  IconArrowLeft,
  IconCheck,
  IconCircleCheck,
  IconClock,
  IconCopy,
  IconDatabase,
  IconFileText,
  IconLayersSubtract,
  IconPlayerStop,
  IconTerminal2,
  IconWifi,
  IconWifiOff,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useRef, useState, useMemo } from "react";
import { useNavigate, useParams } from "@tanstack/react-router";

import type { JobStatus, LogLine } from "@services/jobs";
import { useJob, useKillJob, useJobSocket } from "@services/jobs";
import { useJobOutputs } from "@services/jobs/outputs";

// ─────────────────────────────────────────────────────────────────────────────
// Status helpers
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_COLOR: Record<JobStatus, string> = {
  pending: "yellow",
  running: "blue",
  done: "green",
  failed: "red",
  killed: "gray",
};

const STATUS_LABEL: Record<JobStatus, string> = {
  pending: "Pending",
  running: "Running",
  done: "Done",
  failed: "Failed",
  killed: "Killed",
};

function StatusBadge({ status }: { status: JobStatus }) {
  const isRunning = status === "running";
  return (
    <Indicator
      processing={isRunning}
      color={STATUS_COLOR[status]}
      size={8}
      offset={2}
      disabled={!isRunning}
    >
      <Badge color={STATUS_COLOR[status]} variant="light" size="sm">
        {STATUS_LABEL[status]}
      </Badge>
    </Indicator>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Duration formatter
// ─────────────────────────────────────────────────────────────────────────────

function formatDuration(startedAt?: string, finishedAt?: string): string {
  if (!startedAt) return "—";
  const start = new Date(startedAt).getTime();
  const end = finishedAt ? new Date(finishedAt).getTime() : Date.now();
  const s = Math.floor((end - start) / 1000);
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`;
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`;
}

function formatTs(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Log line renderer — colours stderr red, detects tqdm progress lines
// ─────────────────────────────────────────────────────────────────────────────

function LogLineItem({ line }: { line: LogLine }) {
  const isErr = line.stream === "stderr";
  // tqdm lines end with \r and contain %, mark them as progress
  const isProgress = line.text.includes("%|") || line.text.endsWith("\r");
  return (
    <Text
      component="div"
      size="xs"
      ff="monospace"
      style={{
        lineHeight: 1.6,
        whiteSpace: "pre-wrap",
        wordBreak: "break-all",
        color: isErr
          ? isProgress
            ? "var(--mantine-color-blue-4)" // tqdm progress → blue
            : "var(--mantine-color-red-4)" // real stderr → red
          : "var(--mantine-color-text)",
        opacity: isProgress ? 0.85 : 1,
      }}
    >
      {line.text}
    </Text>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Kill confirm modal
// ─────────────────────────────────────────────────────────────────────────────

function KillModal({
  opened,
  onClose,
  onConfirm,
  isPending,
  jobName,
}: {
  opened: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isPending: boolean;
  jobName: string;
}) {
  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="xs">
          <ThemeIcon color="red" variant="light" size="sm">
            <IconAlertTriangle size={14} />
          </ThemeIcon>
          <Text fw={600} size="sm">
            Kill training job?
          </Text>
        </Group>
      }
      size="sm"
      centered
    >
      <Stack gap="md">
        <Text size="sm" c="dimmed">
          This will send SIGTERM to the training process for{" "}
          <Text component="span" fw={500} c="var(--mantine-color-text)">
            {jobName}
          </Text>
          . Any unsaved checkpoint progress will be lost.
        </Text>
        <Group justify="flex-end" gap="xs">
          <Button
            variant="subtle"
            color="gray"
            size="sm"
            onClick={onClose}
            disabled={isPending}
          >
            Cancel
          </Button>
          <Button
            color="red"
            size="sm"
            loading={isPending}
            onClick={onConfirm}
            leftSection={<IconPlayerStop size={14} />}
          >
            Kill job
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Meta row helper
// ─────────────────────────────────────────────────────────────────────────────

function MetaRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <Group gap="xs" align="flex-start" wrap="nowrap">
      <Text size="xs" c="dimmed" style={{ minWidth: 110, flexShrink: 0 }}>
        {label}
      </Text>
      {mono ? (
        <Text size="xs" ff="monospace" style={{ wordBreak: "break-all" }}>
          {value}
        </Text>
      ) : (
        <Text size="xs">{value}</Text>
      )}
    </Group>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Live duration ticker — updates every second while job is running
// ─────────────────────────────────────────────────────────────────────────────

function LiveDuration({
  startedAt,
  finishedAt,
  status,
}: {
  startedAt?: string;
  finishedAt?: string;
  status: JobStatus;
}) {
  const [, setTick] = useState(0);
  const isLive = status === "running" || status === "pending";

  useEffect(() => {
    if (!isLive) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [isLive]);

  return <>{formatDuration(startedAt, finishedAt)}</>;
}

// ─────────────────────────────────────────────────────────────────────────────
// JobDetailPage
// ─────────────────────────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const { id } = useParams({ from: "/_authenticated/jobs/$id/" });
  const navigate = useNavigate();

  const { data: job, isLoading } = useJob({ id });
  const { mutate: killJob, isPending: isKilling } = useKillJob();
  const [killModalOpen, { open: openKill, close: closeKill }] =
    useDisclosure(false);

  const isTerminal =
    job?.status === "done" ||
    job?.status === "failed" ||
    job?.status === "killed";

  // Poll outputs only when terminal (no need to hammer during training)
  const { data: outputs } = useJobOutputs({ id }, isTerminal, 30_000);

  // ── Socket live logs ────────────────────────────────────────────────────────
  const { logs: socketLogs, isConnected } = useJobSocket({
    jobId: id,
    enabled: !isTerminal,
  });

  // Use socket logs while running; fall back to buffer from REST after terminal
  const logs: LogLine[] = isTerminal ? (job?.logBuffer ?? []) : socketLogs;

  // ── Auto-scroll ─────────────────────────────────────────────────────────────
  //
  // scrollRef → the ScrollArea *viewport* (the actual scrolling div).
  // onScrollCapture fires on the wrapper element — so we read scrollRef.current
  // directly instead of e.currentTarget (they are different DOM nodes).
  //
  // pinned=true  → auto-jump to bottom on every new line (instant, no smooth jitter)
  // pinned=false → user scrolled up; show "Jump to bottom" button
  //
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevLenRef = useRef(0);
  const [pinned, setPinned] = useState(true);

  useEffect(() => {
    if (!pinned) return;
    const el = scrollRef.current;
    if (!el || logs.length === prevLenRef.current) return;
    prevLenRef.current = logs.length;
    el.scrollTop = el.scrollHeight; // instant — smooth causes lag on live tailing
  }, [logs.length, pinned]);

  // Detect manual scroll — unpin when user scrolls away from bottom
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setPinned(atBottom);
  }, []);

  const scrollToBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    setPinned(true);
  }, []);

  // ── Log text for copy ────────────────────────────────────────────────────────
  const logText = useMemo(() => logs.map((l) => l.text).join("\n"), [logs]);

  // ── Kill handler ─────────────────────────────────────────────────────────────
  const handleKillConfirm = () => {
    killJob({ id }, { onSuccess: closeKill });
  };

  // ── Loading state ────────────────────────────────────────────────────────────
  if (isLoading || !job) {
    return (
      <Stack align="center" justify="center" h="100%" gap="xs">
        <Text c="dimmed" size="sm">
          Loading job…
        </Text>
      </Stack>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <>
      <KillModal
        opened={killModalOpen}
        onClose={closeKill}
        onConfirm={handleKillConfirm}
        isPending={isKilling}
        jobName={job.name}
      />

      <Stack gap={0} h="100%" style={{ overflow: "hidden" }}>
        {/* ── Header ────────────────────────────────────────────────────────── */}
        <Box
          p="lg"
          pb="md"
          style={{
            borderBottom: "1px solid var(--mantine-color-default-border)",
            flexShrink: 0,
          }}
        >
          <Group justify="space-between" align="center">
            <Group gap="md" align="center">
              <ActionIcon
                variant="subtle"
                size="sm"
                onClick={() => void navigate({ to: "/jobs" })}
              >
                <IconArrowLeft size={15} />
              </ActionIcon>

              <Stack gap={2}>
                <Group gap="xs" align="center">
                  <Title
                    order={3}
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: "1.1rem",
                    }}
                  >
                    {job.name}
                  </Title>
                  <StatusBadge status={job.status} />
                  <Badge variant="outline" color="gray" size="xs">
                    {job.arch.toUpperCase()}
                  </Badge>
                  <Badge variant="dot" color="blue" size="xs">
                    {job.script}
                  </Badge>
                  {/*{job.archived && (
                    <Badge variant="outline" color="gray" size="xs">
                      Archived
                    </Badge>
                  )}*/}
                </Group>
                <Group gap="xs">
                  <Text size="xs" c="dimmed">
                    <IconClock size={11} style={{ verticalAlign: -1 }} />{" "}
                    <LiveDuration
                      startedAt={job.startedAt}
                      finishedAt={job.finishedAt}
                      status={job.status}
                    />
                  </Text>
                  {/*{job.pid && job.status === "running" && (
                    <Text size="xs" c="dimmed">
                      · PID {job.pid}
                    </Text>
                  )}*/}
                  {job.exitCode !== undefined && (
                    <Text size="xs" c={job.exitCode === 0 ? "green" : "red"}>
                      · exit {job.exitCode}
                    </Text>
                  )}
                </Group>
              </Stack>
            </Group>

            <Group gap="xs">
              {/* WS indicator */}
              {!isTerminal && (
                <Tooltip
                  label={
                    isConnected ? "Live — WebSocket connected" : "Reconnecting…"
                  }
                >
                  <ActionIcon
                    variant="subtle"
                    color={isConnected ? "green" : "yellow"}
                    size="sm"
                  >
                    {isConnected ? (
                      <IconWifi size={14} />
                    ) : (
                      <IconWifiOff size={14} />
                    )}
                  </ActionIcon>
                </Tooltip>
              )}

              {/* Outputs button — visible when terminal */}
              {isTerminal && (
                <Button
                  variant="light"
                  color="blue"
                  size="sm"
                  leftSection={<IconLayersSubtract size={14} />}
                  onClick={() =>
                    void navigate({ to: "/jobs/$id/outputs", params: { id } })
                  }
                  rightSection={
                    outputs && outputs.checkpoints.length > 0 ? (
                      <Badge size="xs" variant="filled" color="blue" circle>
                        {outputs.checkpoints.length}
                      </Badge>
                    ) : undefined
                  }
                >
                  Outputs
                </Button>
              )}

              {/* Kill button — only for running/pending */}
              {!isTerminal && (
                <Button
                  color="red"
                  variant="light"
                  size="sm"
                  leftSection={<IconPlayerStop size={14} />}
                  loading={isKilling}
                  onClick={openKill}
                >
                  Kill
                </Button>
              )}

              {/* Done icon */}
              {job.status === "done" && (
                <ThemeIcon color="green" variant="light" size="sm" radius="xl">
                  <IconCircleCheck size={14} />
                </ThemeIcon>
              )}
              {job.status === "failed" && (
                <ThemeIcon color="red" variant="light" size="sm" radius="xl">
                  <IconX size={14} />
                </ThemeIcon>
              )}
            </Group>
          </Group>
        </Box>

        {/* ── Body ──────────────────────────────────────────────────────────── */}
        <Group
          gap="lg"
          p="lg"
          style={{
            flex: 1,
            minHeight: 0, // flex-потомок Stack — без этого не сжимается
            overflow: "hidden",
            flexWrap: "nowrap",
            alignItems: "stretch", // дети растягиваются на всю высоту Group
          }}
        >
          {/* ── Log terminal (left, grows) ──────────────────────────────────── */}
          <Paper
            withBorder
            radius="md"
            style={{
              flex: "1 1 0",
              minWidth: 0,
              minHeight: 0, // без этого Paper растёт до размера контента
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              background: "var(--mantine-color-dark-8, #1a1b1e)",
            }}
          >
            {/* Terminal toolbar */}
            <Group
              px="sm"
              py={6}
              gap="xs"
              style={{
                borderBottom: "1px solid var(--mantine-color-default-border)",
                flexShrink: 0,
              }}
            >
              <IconTerminal2 size={13} color="var(--mantine-color-dimmed)" />
              <Text size="xs" c="dimmed" style={{ flex: 1 }} truncate>
                {job.logFilePath}
              </Text>

              <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                {logs.length} lines
              </Text>

              {/* Copy logs */}
              <CopyButton value={logText} timeout={1500}>
                {({ copied, copy }) => (
                  <Tooltip label={copied ? "Copied!" : "Copy logs"}>
                    <ActionIcon
                      size="xs"
                      variant="subtle"
                      color={copied ? "green" : "gray"}
                      onClick={copy}
                    >
                      {copied ? (
                        <IconCheck size={11} />
                      ) : (
                        <IconCopy size={11} />
                      )}
                    </ActionIcon>
                  </Tooltip>
                )}
              </CopyButton>
            </Group>

            {/* Log lines — scroll-контейнер.
                flex:'1 1 0' + minHeight:0 — стандартный приём для flex-потомка,
                которому нужно заполнить оставшееся место и уметь скроллиться.
                styles.viewport пробрасывает height:'100%' внутрь Mantine ScrollArea
                (внешний wrapper ≠ внутренний viewport). */}
            <Box style={{ flex: "1 1 0", minHeight: 0, position: "relative" }}>
              <ScrollArea
                viewportRef={scrollRef}
                onScrollCapture={handleScroll}
                h="100%"
                scrollbarSize={6}
                styles={{ viewport: { height: "100%" } }}
              >
                {logs.length === 0 ? (
                  <Text size="xs" c="dimmed" p="sm">
                    {job.status === "pending"
                      ? "Waiting for process to start…"
                      : "No output yet."}
                  </Text>
                ) : (
                  <Box component="div" pb={4}>
                    {logs.map((line) => (
                      <LogLineItem key={line.text} line={line} />
                    ))}
                  </Box>
                )}
              </ScrollArea>

              {/* Jump-to-bottom button — floats over the log when unpinned */}
              {!pinned && (
                <Box
                  style={{
                    position: "absolute",
                    bottom: 12,
                    right: 20,
                    zIndex: 10,
                  }}
                >
                  <Button
                    size="compact-xs"
                    variant="filled"
                    color="blue"
                    leftSection={<IconArrowDown size={11} />}
                    onClick={scrollToBottom}
                    style={{
                      opacity: 0.92,
                      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
                    }}
                  >
                    Jump to bottom
                  </Button>
                </Box>
              )}
            </Box>
          </Paper>

          {/* ── Right panel: metadata ───────────────────────────────────────── */}
          <Stack
            gap="sm"
            style={{
              flex: "0 0 320px",
              overflowY: "auto", // скролл если метаданных много
            }}
          >
            {/* Timing */}
            <Paper withBorder p="sm" radius="md">
              <Stack gap={6}>
                <Text
                  fw={600}
                  size="xs"
                  c="dimmed"
                  tt="uppercase"
                  style={{ letterSpacing: "0.06em" }}
                >
                  Timing
                </Text>
                <MetaRow label="Created" value={formatTs(job.createdAt)} />
                <MetaRow label="Started" value={formatTs(job.startedAt)} />
                <MetaRow label="Finished" value={formatTs(job.finishedAt)} />
                <MetaRow
                  label="Duration"
                  value={
                    <LiveDuration
                      startedAt={job.startedAt}
                      finishedAt={job.finishedAt}
                      status={job.status}
                    />
                  }
                />
              </Stack>
            </Paper>

            {/* Dataset */}
            {job.datasetName && (
              <Paper withBorder p="sm" radius="md">
                <Stack gap={6}>
                  <Group gap={6}>
                    <IconDatabase
                      size={12}
                      color="var(--mantine-color-dimmed)"
                    />
                    <Text
                      fw={600}
                      size="xs"
                      c="dimmed"
                      tt="uppercase"
                      style={{ letterSpacing: "0.06em" }}
                    >
                      Dataset
                    </Text>
                  </Group>
                  <Text size="xs" ff="monospace">
                    {job.datasetName}
                  </Text>
                </Stack>
              </Paper>
            )}

            {/* Paths */}
            <Paper withBorder p="sm" radius="md">
              <Stack gap={6}>
                <Group gap={6}>
                  <IconFileText size={12} color="var(--mantine-color-dimmed)" />
                  <Text
                    fw={600}
                    size="xs"
                    c="dimmed"
                    tt="uppercase"
                    style={{ letterSpacing: "0.06em" }}
                  >
                    Paths
                  </Text>
                </Group>
                <MetaRow label="Job dir" value={job.jobDir} mono />
                <MetaRow label="Train TOML" value={job.trainTomlPath} mono />
                <MetaRow
                  label="Dataset TOML"
                  value={job.datasetTomlPath}
                  mono
                />
                <MetaRow label="Log file" value={job.logFilePath} mono />
              </Stack>
            </Paper>

            {/* Command */}
            <Paper withBorder p="sm" radius="md">
              <Stack gap={6}>
                <Group gap="xs" align="center">
                  <IconTerminal2
                    size={12}
                    color="var(--mantine-color-dimmed)"
                  />
                  <Text
                    fw={600}
                    size="xs"
                    c="dimmed"
                    tt="uppercase"
                    style={{ letterSpacing: "0.06em" }}
                  >
                    Command
                  </Text>
                  <CopyButton value={job.command} timeout={1500}>
                    {({ copied, copy }) => (
                      <Tooltip label={copied ? "Copied!" : "Copy"}>
                        <ActionIcon
                          size="xs"
                          variant="subtle"
                          color={copied ? "green" : "gray"}
                          onClick={copy}
                          ml="auto"
                        >
                          {copied ? (
                            <IconCheck size={10} />
                          ) : (
                            <IconCopy size={10} />
                          )}
                        </ActionIcon>
                      </Tooltip>
                    )}
                  </CopyButton>
                </Group>
                <Code
                  block
                  style={{
                    fontSize: 10,
                    lineHeight: 1.6,
                    background: "transparent",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                  }}
                >
                  {job.command}
                </Code>
              </Stack>
            </Paper>
          </Stack>
        </Group>
      </Stack>
    </>
  );
}
