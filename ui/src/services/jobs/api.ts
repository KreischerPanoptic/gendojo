import { apiClient } from '@services/client'
import type {
  CreateJobRequest,
  JobDetail,
  JobLogsResponse,
  JobSummary,
  KillJobResponse,
} from './types'

export const jobsApi = {
  /**
   * POST /jobs
   * Creates and immediately starts a training job.
   * Returns the full job detail (empty log buffer).
   *
   * @throws 422 if train config validation fails
   * @throws 409 if max concurrent jobs reached
   */
  create: async (request: CreateJobRequest): Promise<JobDetail> => {
    const { data } = await apiClient.post<JobDetail>('/jobs', request)
    return data
  },

  /**
   * GET /jobs
   * Returns all jobs without log buffers (cheap for polling / list view).
   */
  list: async (): Promise<JobSummary[]> => {
    const { data } = await apiClient.get<JobSummary[]>('/jobs')
    return data
  },

  /**
   * GET /jobs/:id
   * Returns full job detail including log buffer.
   */
  getOne: async (id: string): Promise<JobDetail> => {
    const { data } = await apiClient.get<JobDetail>(`/jobs/${id}`)
    return data
  },

  /**
   * GET /jobs/:id/logs
   * Returns only the log buffer — lighter than getOne for polling.
   * Use this when the WebSocket connection is unavailable.
   */
  getLogs: async (id: string): Promise<JobLogsResponse> => {
    const { data } = await apiClient.get<JobLogsResponse>(`/jobs/${id}/logs`)
    return data
  },

  /**
   * DELETE /jobs/:id
   * Sends SIGTERM to the running process (SIGKILL after 5s).
   * Idempotent — safe to call on already-finished jobs.
   */
  kill: async (id: string): Promise<KillJobResponse> => {
    const { data } = await apiClient.delete<KillJobResponse>(`/jobs/${id}`)
    return data
  },
}