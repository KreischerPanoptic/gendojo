export interface VramInfo {
  totalMiB: number;
  usedMiB: number;
  freeMiB: number;
  usedPercent: number;
}

export interface GpuUtilization {
  gpuPercent: number;
  memoryPercent: number;
}

export interface PowerInfo {
  /** null when the GPU does not expose power metrics (e.g. [N/A] from nvidia-smi) */
  drawWatts: number | null;
  limitWatts: number | null;
}

export interface GpuInfo {
  index: number;
  name: string;
  uuid: string;
  driverVersion: string;
  vram: VramInfo;
  utilization: GpuUtilization;
  temperatureCelsius: number;
  power: PowerInfo;
}

export interface CpuInfo {
  model: string;
  /**
   * Logical CPU thread count as reported by the OS (includes HyperThreading).
   * Renamed from `physicalCores` — os.cpus() returns logical threads, not physical cores.
   */
  logicalCores: number;
  usedPercent: number;
  /** 1-min, 5-min, 15-min load averages */
  loadAvg: [number, number, number];
}

export interface MemoryInfo {
  totalBytes: number;
  usedBytes: number;
  freeBytes: number;
  availableBytes: number;
  buffersBytes: number;
  cachedBytes: number;
  usedPercent: number;
}

export interface DiskInfo {
  source: string;
  mountpoint: string;
  totalBytes: number;
  usedBytes: number;
  availableBytes: number;
  usedPercent: number;
}

export interface SystemSnapshot {
  timestamp: string;
  hostname: string;
  uptime: number;
  gpus: GpuInfo[];
  cpu: CpuInfo;
  memory: MemoryInfo;
  disks: DiskInfo[];
}