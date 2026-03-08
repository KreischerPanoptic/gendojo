// ─────────────────────────────────────────────────────────────────────────────
// Query keys
// ─────────────────────────────────────────────────────────────────────────────

export const jobsQueryKeys = {
  all:    ['jobs']              as const,
  detail: (id: string) => ['jobs', id] as const,
  logs:   (id: string) => ['jobs', id, 'logs'] as const,
}