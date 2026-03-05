export const modelsQueryKeys = {
  all:    ['models']                       as const,
  detail: (id: string) => ['models', id]  as const,
}