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
  drawWatts: number;
  limitWatts: number;
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
  physicalCores: number;
  usedPercent: number;
  /** 1 min, 5 min, 15 min load average */
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