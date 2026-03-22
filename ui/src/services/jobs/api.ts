import {
  jobsControllerCreate,
  jobsControllerGetLogs,
  jobsControllerGetOne,
  jobsControllerKill,
  jobsControllerList,
} from "@api/sdk.gen";
import type {
  JobDetailResponseDto,
  JobLogsResponseDto,
  JobsControllerCreateData,
  JobsControllerGetOneData,
  JobSummaryResponseDto,
  KillJobResponseDto,
} from "@api/types.gen";

export const jobsApi = {
  /**
   * POST /jobs
   * Creates and immediately starts a training job.
   * Returns the full job detail (empty log buffer).
   *
   * @throws 422 if train config validation fails
   * @throws 409 if max concurrent jobs reached
   */
  create: (
    body: JobsControllerCreateData["body"],
  ): Promise<JobDetailResponseDto> =>
    jobsControllerCreate({ body }).then((r) => {
      if (!r.data) throw new Error(`Can't start new job.`);
      return r.data;
    }),

  /**
   * GET /jobs
   * Returns all jobs without log buffers (cheap for polling / list view).
   */
  list: (): Promise<JobSummaryResponseDto[]> =>
    jobsControllerList({}).then((r) => r.data ?? []),

  /**
   * GET /jobs/:id
   * Returns full job detail including log buffer.
   */
  getOne: (
    path: JobsControllerGetOneData["path"],
  ): Promise<JobDetailResponseDto> =>
    jobsControllerGetOne({ path }).then((r) => {
      if (!r.data) throw new Error(`Can't find job.`);
      return r.data;
    }),

  /**
   * GET /jobs/:id/logs
   * Returns only the log buffer — lighter than getOne for polling.
   * Use this when the WebSocket connection is unavailable.
   */
  getLogs: (
    path: JobsControllerGetOneData["path"],
  ): Promise<JobLogsResponseDto> =>
    jobsControllerGetLogs({ path }).then((r) => {
      if (!r.data) throw new Error(`Can't find job logs.`);
      return r.data;
    }),

  /**
   * DELETE /jobs/:id
   * Sends SIGTERM to the running process (SIGKILL after 5s).
   * Idempotent — safe to call on already-finished jobs.
   */
  kill: async (
    path: JobsControllerGetOneData["path"],
  ): Promise<KillJobResponseDto> =>
    jobsControllerKill({ path }).then((r) => {
      if (!r.data) throw new Error(`Can't kill job.`);
      return r.data;
    }),
};
