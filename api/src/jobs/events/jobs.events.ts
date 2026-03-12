// ─────────────────────────────────────────────────────────────────────────────
// Socket.IO event shapes
// ─────────────────────────────────────────────────────────────────────────────

import { JobStatus, LogLine, JobProgress } from "../types/jobs.types";

export interface JobLogEvent {
  jobId: string;
  line: LogLine;
}

export interface JobStatusEvent {
  jobId: string;
  status: JobStatus;
  exitCode?: number;
}

export interface JobProgressEvent {
  jobId: string;
  progress: JobProgress;
}