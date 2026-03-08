export interface GpuVramInfo {
  totalMiB: number
  usedMiB: number
  freeMiB: number
  usedPercent: number
}

export interface GpuUtilizationInfo {
  gpuPercent: number
  memoryPercent: number
}

export interface GpuPowerInfo {
  drawWatts: number
  limitWatts?: number
}

export interface GpuInfo {
  index: number
  name: string
  uuid: string
  driverVersion: string
  vram: GpuVramInfo
  utilization: GpuUtilizationInfo
  temperatureCelsius: number
  power: GpuPowerInfo
}

export interface CpuInfo {
  usagePercent: number
  physicalCores: number
  model?: string
  loadAvg: number[]
}

export interface MemoryInfo {
  usedBytes: number
  totalBytes: number
  freeBytes: number
  availableBytes: number
  buffersBytes: number
  cachedBytes: number
  usedPercent: number
}

export interface DiskInfo {
  usedBytes: number
  totalBytes: number
  freeBytes: number
  usagePercent: number
  path: string
}

export interface SystemSnapshot {
  timestamp: string
  gpus: GpuInfo[]
  cpu: CpuInfo
  memory: MemoryInfo
  disks: DiskInfo
  uptime: number
  hostname: string
}