import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as os from 'os';
import * as fs from 'fs/promises';
import { SystemSnapshot, GpuInfo, CpuInfo, MemoryInfo, DiskInfo } from './entities/system.types';

const execAsync = promisify(exec);

@Injectable()
export class SystemService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SystemService.name);

  /** Последний успешно собранный снапшот — отдаём его по GET без ожидания */
  private snapshot: SystemSnapshot | null = null;

  /** Предыдущие значения /proc/stat для расчёта delta CPU */
  private prevCpuTimes: number[] | null = null;

  private pollInterval: ReturnType<typeof setInterval> | null = null;
  private readonly POLL_MS = 5_000;

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  onModuleInit(): void {
    void this.poll();
    this.pollInterval = setInterval(() => void this.poll(), this.POLL_MS);
  }

  onModuleDestroy(): void {
    if (this.pollInterval) clearInterval(this.pollInterval);
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  getSnapshot(): SystemSnapshot | null {
    return this.snapshot;
  }

  async refresh(): Promise<SystemSnapshot> {
    await this.poll();
    return this.snapshot!;
  }

  // ─── Poll orchestrator ────────────────────────────────────────────────────

  private async poll(): Promise<void> {
    try {
      const [gpus, cpu, memory, disks] = await Promise.all([
        this.collectGpus(),
        this.collectCpu(),
        this.collectMemory(),
        this.collectDisks(),
      ]);

      this.snapshot = {
        timestamp: new Date().toISOString(),
        gpus,
        cpu,
        memory,
        disks,
        uptime: os.uptime(),
        hostname: os.hostname(),
      };
    } catch (err) {
      this.logger.warn(`Poll failed: ${(err as Error).message}`);
    }
  }

  // ─── GPU via nvidia-smi ───────────────────────────────────────────────────

  private async collectGpus(): Promise<GpuInfo[]> {
    const query = [
      'index',
      'name',
      'uuid',
      'driver_version',
      'memory.total',
      'memory.used',
      'memory.free',
      'utilization.gpu',
      'utilization.memory',
      'temperature.gpu',
      'power.draw',
      'power.limit',
    ].join(',');

    const format = 'csv,noheader,nounits';

    let stdout: string;
    try {
      ({ stdout } = await execAsync(
        `nvidia-smi --query-gpu=${query} --format=${format}`,
        { timeout: 10_000 },
      ));
    } catch {
      // GPU недоступен или nvidia-smi не установлен
      return [];
    }

    return stdout
      .trim()
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const [
          index,
          name,
          uuid,
          driverVersion,
          memTotal,
          memUsed,
          memFree,
          gpuUtil,
          memUtil,
          tempGpu,
          powerDraw,
          powerLimit,
        ] = line.split(', ').map((v) => v.trim());

        return {
          index: parseInt(index, 10),
          name,
          uuid,
          driverVersion,
          vram: {
            totalMiB: parseFloat(memTotal),
            usedMiB: parseFloat(memUsed),
            freeMiB: parseFloat(memFree),
            usedPercent: Math.round((parseFloat(memUsed) / parseFloat(memTotal)) * 100),
          },
          utilization: {
            gpuPercent: parseFloat(gpuUtil),
            memoryPercent: parseFloat(memUtil),
          },
          temperatureCelsius: parseFloat(tempGpu),
          power: {
            drawWatts: parseFloat(powerDraw),
            limitWatts: parseFloat(powerLimit),
          },
        } satisfies GpuInfo;
      });
  }

  // ─── CPU via /proc/stat ───────────────────────────────────────────────────

  private async collectCpu(): Promise<CpuInfo> {
    let cpuPercent = 0;

    try {
      const stat = await fs.readFile('/proc/stat', 'utf8');
      const line = stat.split('\n')[0]; // cpu  aggregate line
      // cpu  user nice system idle iowait irq softirq steal guest guest_nice
      const parts = line.split(/\s+/).slice(1).map(Number);
      const idle = parts[3] + (parts[4] ?? 0); // idle + iowait
      const total = parts.reduce((a, b) => a + b, 0);

      if (this.prevCpuTimes) {
        const [prevTotal, prevIdle] = this.prevCpuTimes;
        const deltaTotal = total - prevTotal;
        const deltaIdle = idle - prevIdle;
        cpuPercent = deltaTotal > 0
          ? Math.round(((deltaTotal - deltaIdle) / deltaTotal) * 100)
          : 0;
      }

      this.prevCpuTimes = [total, idle];
    } catch {
      // Fallback для non-Linux (Windows dev machine)
      cpuPercent = 0;
    }

    const cpus = os.cpus();

    return {
      model: cpus[0]?.model ?? 'Unknown',
      physicalCores: cpus.length,
      usedPercent: cpuPercent,
      loadAvg: os.loadavg() as [number, number, number],
    };
  }

  // ─── Memory via /proc/meminfo ─────────────────────────────────────────────

  private async collectMemory(): Promise<MemoryInfo> {
    try {
      const raw = await fs.readFile('/proc/meminfo', 'utf8');
      const get = (key: string): number => {
        const match = raw.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'));
        return match ? parseInt(match[1], 10) * 1024 : 0; // kB → bytes
      };

      const total = get('MemTotal');
      const free = get('MemFree');
      const available = get('MemAvailable');
      const buffers = get('Buffers');
      const cached = get('Cached');
      const used = total - available;

      return {
        totalBytes: total,
        usedBytes: used,
        freeBytes: free,
        availableBytes: available,
        buffersBytes: buffers,
        cachedBytes: cached,
        usedPercent: Math.round((used / total) * 100),
      };
    } catch {
      // Fallback — os.freemem / os.totalmem
      const total = os.totalmem();
      const free = os.freemem();
      const used = total - free;
      return {
        totalBytes: total,
        usedBytes: used,
        freeBytes: free,
        availableBytes: free,
        buffersBytes: 0,
        cachedBytes: 0,
        usedPercent: Math.round((used / total) * 100),
      };
    }
  }

  // ─── Disk via df ──────────────────────────────────────────────────────────

  private async collectDisks(): Promise<DiskInfo[]> {
    const WATCH_PATHS = [
      '/workspace',
      '/workspace/models',
      '/workspace/datasets',
      '/workspace/outputs',
      '/workspace/logs',
      '/',
    ];

    let stdout: string;
    try {
      ({ stdout } = await execAsync(
        `df -B1 --output=source,target,size,used,avail,pcent ${WATCH_PATHS.join(' ')} 2>/dev/null || df -B1 ${WATCH_PATHS.join(' ')} 2>/dev/null || df -B1 /`,
        { timeout: 10_000 },
      ));
    } catch {
      return [];
    }

    const seen = new Set<string>();
    const disks: DiskInfo[] = [];

    for (const line of stdout.trim().split('\n').slice(1)) {
      const parts = line.trim().split(/\s+/);
      if (parts.length < 5) continue;

      // df --output: source target size used avail pcent
      // df plain:    source size used avail pcent target
      const hasOutput = parts.length >= 6 && parts[5]?.includes('%');
      const [source, target, sizeRaw, usedRaw, availRaw, pcentRaw] = hasOutput
        ? parts
        : [parts[0], parts[5], parts[1], parts[2], parts[3], parts[4]];

      if (!target || seen.has(target)) continue;
      seen.add(target);

      const totalBytes = parseInt(sizeRaw, 10);
      const usedBytes = parseInt(usedRaw, 10);
      const availableBytes = parseInt(availRaw, 10);
      const usedPercent = parseInt(pcentRaw?.replace('%', '') ?? '0', 10);

      if (isNaN(totalBytes)) continue;

      disks.push({ source, mountpoint: target, totalBytes, usedBytes, availableBytes, usedPercent });
    }

    return disks;
  }
}