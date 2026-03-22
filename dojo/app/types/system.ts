export type VramInfo = {
  totalMiB: number
  usedMiB: number
  freeMiB: number
  usedPercent: number
}

export type GpuUtilization = {
  gpuPercent: number
  memoryPercent: number
}

export type PowerInfo = {
  /** null when the GPU does not expose power metrics (e.g. [N/A] from nvidia-smi) */
  drawWatts: number | null
  limitWatts: number | null
}

export type GpuInfo = {
  index: number
  name: string
  uuid: string
  driverVersion: string
  vram: VramInfo
  utilization: GpuUtilization
  temperatureCelsius: number
  power: PowerInfo
}

export type CpuInfo = {
  model: string
  /**
   * Logical CPU thread count as reported by the OS (includes HyperThreading).
   * Renamed from `physicalCores` — os.cpus() returns logical threads, not physical cores.
   */
  logicalCores: number
  usedPercent: number
  /** 1-min, 5-min, 15-min load averages */
  loadAvg: [number, number, number]
}

export type MemoryInfo = {
  totalBytes: number
  usedBytes: number
  freeBytes: number
  availableBytes: number
  buffersBytes: number
  cachedBytes: number
  usedPercent: number
}

export type DiskInfo = {
  source: string
  mountpoint: string
  totalBytes: number
  usedBytes: number
  availableBytes: number
  usedPercent: number
}

export type SystemSnapshot = {
  timestamp: string
  hostname: string
  uptime: number
  gpus: GpuInfo[]
  cpu: CpuInfo
  memory: MemoryInfo
  disks: DiskInfo[]
}
