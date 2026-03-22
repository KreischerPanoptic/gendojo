import { useEffect, useRef, useCallback, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { jobsApi } from "./api";
import type {
  JobDetail,
  JobLogEvent,
  JobStatusEvent,
  JobSummary,
  LogLine,
} from "./types";
import { getJobsSocket } from "@services/socket";
import { jobsQueryKeys } from "./keys";
import type {
  JobDetailResponseDto,
  JobsControllerCreateData,
  JobsControllerKillData,
  JobSummaryResponseDto,
} from "@api/types.gen";

// ─────────────────────────────────────────────────────────────────────────────
// Create job
// ─────────────────────────────────────────────────────────────────────────────

export const useCreateJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: JobsControllerCreateData["body"]) =>
      jobsApi.create(body),

    onSuccess: (newJob: JobDetailResponseDto) => {
      // Optimistically add to list cache
      queryClient.setQueryData<JobSummaryResponseDto[]>(
        jobsQueryKeys.all,
        (prev = []) => [newJob, ...prev],
      );
      // Seed detail cache so the job page loads instantly
      queryClient.setQueryData(jobsQueryKeys.detail(newJob.id), newJob);
    },

    onError: (error) => {
      console.error("[Jobs] Create failed:", error);
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// Kill job
// ─────────────────────────────────────────────────────────────────────────────

export const useKillJob = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (path: JobsControllerKillData["path"]) => jobsApi.kill(path),

    onSuccess: (result, id) => {
      // Update status in the list cache immediately
      queryClient.setQueryData<JobSummaryResponseDto[]>(
        jobsQueryKeys.all,
        (prev = []) =>
          prev.map((j) =>
            j.id === id.id ? { ...j, status: result.status ?? "killed" } : j,
          ),
      );
      // Also update the detail cache if it exists
      queryClient.setQueryData<JobDetailResponseDto>(
        jobsQueryKeys.detail(id.id),
        (prev) =>
          prev ? { ...prev, status: result.status ?? "killed" } : prev,
      );
    },

    onError: (error) => {
      console.error("[Jobs] Kill failed:", error);
    },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// WebSocket hook — subscribe to live log and status events for one job
// ─────────────────────────────────────────────────────────────────────────────

export interface UseJobSocketOptions {
  jobId: string;
  /** Called for each new log line (real-time) */
  onLog?: (event: JobLogEvent) => void;
  /** Called when job status changes */
  onStatus?: (event: JobStatusEvent) => void;
  /** Whether to connect. Pass false to skip (e.g. if job is already done) */
  enabled?: boolean;
}

export interface UseJobSocketReturn {
  /** Log lines collected since the hook mounted (history + live) */
  logs: LogLine[];
  isConnected: boolean;
}

export const useJobSocket = ({
  jobId,
  onLog,
  onStatus,
  enabled = true,
}: UseJobSocketOptions): UseJobSocketReturn => {
  const queryClient = useQueryClient();
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(getJobsSocket());

  const handleLog = useCallback(
    (event: JobLogEvent) => {
      if (event.jobId !== jobId) return;
      setLogs((prev) => [...prev, event.line]);
      onLog?.(event);
    },
    [jobId, onLog],
  );

  const handleStatus = useCallback(
    (event: JobStatusEvent) => {
      if (event.jobId !== jobId) return;

      // Update query cache so the jobs list reflects the new status
      queryClient.setQueryData<JobSummary[]>(jobsQueryKeys.all, (prev = []) =>
        prev.map((j) =>
          j.id === jobId
            ? { ...j, status: event.status, exitCode: event.exitCode }
            : j,
        ),
      );
      queryClient.setQueryData<JobDetail>(
        jobsQueryKeys.detail(jobId),
        (prev) =>
          prev
            ? { ...prev, status: event.status, exitCode: event.exitCode }
            : prev,
      );

      onStatus?.(event);
    },
    [jobId, onStatus, queryClient],
  );

  useEffect(() => {
    if (!enabled) return;

    const socket = socketRef.current;

    const onConnect = () => {
      setIsConnected(true);
      socket.emit("job:subscribe", { jobId });
    };

    const onDisconnect = () => setIsConnected(false);

    const onHistory = (payload: { jobId: string; lines: LogLine[] }) => {
      if (payload.jobId === jobId) {
        setLogs(payload.lines);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("job:history", onHistory);
    socket.on("job:log", handleLog);
    socket.on("job:status", handleStatus);

    // If already connected, subscribe immediately
    if (socket.connected) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsConnected(true);
      socket.emit("job:subscribe", { jobId });
    }

    return () => {
      socket.emit("job:unsubscribe", { jobId });
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("job:history", onHistory);
      socket.off("job:log", handleLog);
      socket.off("job:status", handleStatus);
    };
  }, [jobId, enabled, handleLog, handleStatus]);

  return { logs, isConnected };
};
