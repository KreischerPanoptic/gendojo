// ─────────────────────────────────────────────────────────────────────────────
// Query keys
// ─────────────────────────────────────────────────────────────────────────────

export const datasetsQueryKeys = {
  all:     ['datasets']                                             as const,
  detail:  (name: string) => ['datasets', name]                    as const,
  caption: (name: string, image: string) => ['datasets', name, 'captions', image] as const,
}