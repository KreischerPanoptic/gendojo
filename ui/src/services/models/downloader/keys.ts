export const downloaderQueryKeys = {
  presets: ['downloader', 'presets']                     as const,
  jobs:    ['downloader', 'jobs']                        as const,
  job:     (id: string) => ['downloader', 'jobs', id]   as const,
}