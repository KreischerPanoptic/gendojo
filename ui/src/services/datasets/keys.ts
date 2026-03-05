// ─────────────────────────────────────────────────────────────────────────────
// Query keys
// ─────────────────────────────────────────────────────────────────────────────

export const datasetsQueryKeys = {
  all:     ['datasets']               as const,
  detail:  (name: string) => ['datasets', name] as const,
}