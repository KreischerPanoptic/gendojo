export function formatSize(bytes: number): string {
  if (bytes === 0) return '—'
  const GiB = 1024 ** 3
  const MiB = 1024 ** 2
  if (bytes >= GiB) return `${(bytes / GiB).toFixed(2)} GB`
  if (bytes >= MiB) return `${(bytes / MiB).toFixed(0)} MB`
  return `${(bytes / 1024).toFixed(0)} KB`
}
