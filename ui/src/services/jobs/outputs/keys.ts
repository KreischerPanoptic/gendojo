export const outputsQueryKeys = {
  outputs: (jobId: string) => ['jobs', jobId, 'outputs'] as const,
}