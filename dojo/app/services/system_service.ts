import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import os from 'node:os'
import fs from 'node:fs/promises'
import logger from '@adonisjs/core/services/logger'
import type { SystemSnapshot, GpuInfo, CpuInfo, MemoryInfo, DiskInfo } from '#types/system'

const execAsync = promisify(exec)

function safeFloat(value: string | undefined): number | null {
  if (!value || value.trim() === '[N/A]' || value.trim() === 'N/A') return null
  const n = Number.parseFloat(value.trim())
  return Number.isNaN(n) ? null : n
}

function safeInt(value: string | undefined): number | null {
  if (!value || value.trim() === '[N/A]' || value.trim() === 'N/A') return null
  const n = Number.parseInt(value.trim(), 10)
  return Number.isNaN(n) ? null : n
}

export default class SystemService {
  private snapshot: SystemSnapshot | null = null
  private prevCpuTimes: [number, number] | null = null
  private isPolling = false
  private isBooted = false

  public boot() {
    if (this.isBooted) return
    this.isBooted = true
    void this.poll()
    setInterval(() => void this.poll(), 5000)
    //console.log('System metrics polling started')
  }

  public getSnapshot(): SystemSnapshot {
    return (
      this.snapshot ?? {
        timestamp: '',
        hostname: '',
        uptime: -1,
        gpus: [],
        cpu: {
          model: '',
          logicalCores: -1,
          usedPercent: -1,
          loadAvg: [-1, -1, -1],
        },
        memory: {
          totalBytes: -1,
          usedBytes: -1,
          freeBytes: -1,
          availableBytes: -1,
          buffersBytes: -1,
          cachedBytes: -1,
          usedPercent: -1,
        },
        disks: [],
      }
    )
  }

  public async refresh(): Promise<SystemSnapshot> {
    await this.poll()
    return (
      this.snapshot ?? {
        timestamp: '',
        hostname: '',
        uptime: -1,
        gpus: [],
        cpu: {
          model: '',
          logicalCores: -1,
          usedPercent: -1,
          loadAvg: [-1, -1, -1],
        },
        memory: {
          totalBytes: -1,
          usedBytes: -1,
          freeBytes: -1,
          availableBytes: -1,
          buffersBytes: -1,
          cachedBytes: -1,
          usedPercent: -1,
        },
        disks: [],
      }
    )
  }

  private async poll(): Promise<void> {
    if (this.isPolling) return
    this.isPolling = true

    try {
      const [gpus, cpu, memory, disks] = await Promise.all([
        this.collectGpus(),
        this.collectCpu(),
        this.collectMemory(),
        this.collectDisks(),
      ])

      this.snapshot = {
        timestamp: new Date().toISOString(),
        gpus,
        cpu,
        memory,
        disks,
        uptime: os.uptime(),
        hostname: os.hostname(),
      }
    } catch (err) {
      logger.warn(`Poll failed: ${(err as Error).message}`)
    } finally {
      this.isPolling = false
    }
  }

  // ── GPU via nvidia-smi ─────────────────────────────────────────────────────

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
    ].join(',')

    let stdout: string
    try {
      ;({ stdout } = await execAsync(
        `nvidia-smi --query-gpu=${query} --format=csv,noheader,nounits`,
        { timeout: 10_000 }
      ))
    } catch {
      // No NVIDIA GPU or nvidia-smi not installed — not an error
      return []
    }

    const lines = stdout.trim().split('\n').filter(Boolean)
    const results: GpuInfo[] = []

    for (const line of lines) {
      const parts = line.split(', ').map((v) => v.trim())
      const [
        indexStr,
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
      ] = parts

      const totalMiB = safeFloat(memTotal) ?? 0
      const usedMiB = safeFloat(memUsed) ?? 0

      results.push({
        index: safeInt(indexStr) ?? 0,
        name: name ?? 'Unknown',
        uuid: uuid ?? '',
        driverVersion: driverVersion ?? '',
        vram: {
          totalMiB,
          usedMiB,
          freeMiB: safeFloat(memFree) ?? totalMiB - usedMiB,
          usedPercent: totalMiB > 0 ? Math.round((usedMiB / totalMiB) * 100) : 0,
        },
        utilization: {
          gpuPercent: safeFloat(gpuUtil) ?? 0,
          memoryPercent: safeFloat(memUtil) ?? 0,
        },
        temperatureCelsius: safeFloat(tempGpu) ?? 0,
        power: {
          // power.draw / power.limit return [N/A] on some GPUs — null is correct
          drawWatts: safeFloat(powerDraw),
          limitWatts: safeFloat(powerLimit),
        },
      })
    }

    return results
  }

  // ── CPU ────────────────────────────────────────────────────────────────────

  private async collectCpu(): Promise<CpuInfo> {
    let usedPercent = 0

    try {
      // /proc/stat is Linux-only — falls back to 0 on macOS/Windows (dev machines)
      const stat = await fs.readFile('/proc/stat', 'utf8')
      const line = stat.split('\n')[0] // aggregate "cpu" line
      // Fields: user nice system idle iowait irq softirq steal guest guest_nice
      const parts = line.split(/\s+/).slice(1).map(Number)
      const idle = parts[3] + (parts[4] ?? 0) // idle + iowait
      const total = parts.reduce((a, b) => a + b, 0)

      if (this.prevCpuTimes) {
        const [prevTotal, prevIdle] = this.prevCpuTimes
        const deltaTotal = total - prevTotal
        const deltaIdle = idle - prevIdle
        usedPercent = deltaTotal > 0 ? Math.round(((deltaTotal - deltaIdle) / deltaTotal) * 100) : 0
      }

      this.prevCpuTimes = [total, idle]
    } catch {
      // Non-Linux (dev machine) — return 0, not an error
    }

    const cpus = os.cpus()

    return {
      model: cpus[0]?.model ?? 'Unknown',
      // os.cpus() returns logical threads (HyperThreading included)
      logicalCores: cpus.length,
      usedPercent,
      loadAvg: os.loadavg() as [number, number, number],
    }
  }

  // ── Memory ─────────────────────────────────────────────────────────────────

  private async collectMemory(): Promise<MemoryInfo> {
    try {
      // /proc/meminfo is Linux-only — accurate cache/buffer accounting
      const raw = await fs.readFile('/proc/meminfo', 'utf8')

      const getKb = (key: string): number => {
        const match = raw.match(new RegExp(`^${key}:\\s+(\\d+)`, 'm'))
        return match ? Number.parseInt(match[1], 10) * 1024 : 0 // kB → bytes
      }

      const total = getKb('MemTotal')
      const free = getKb('MemFree')
      const available = getKb('MemAvailable')
      const buffers = getKb('Buffers')
      const cached = getKb('Cached')
      const used = total - available

      return {
        totalBytes: total,
        usedBytes: used,
        freeBytes: free,
        availableBytes: available,
        buffersBytes: buffers,
        cachedBytes: cached,
        // Use available (not free) for usedPercent — matches what htop shows
        usedPercent: total > 0 ? Math.round((used / total) * 100) : 0,
      }
    } catch {
      // Fallback for non-Linux (no buffer/cache distinction)
      const total = os.totalmem()
      const free = os.freemem()
      const used = total - free
      return {
        totalBytes: total,
        usedBytes: used,
        freeBytes: free,
        availableBytes: free,
        buffersBytes: 0,
        cachedBytes: 0,
        usedPercent: total > 0 ? Math.round((used / total) * 100) : 0,
      }
    }
  }

  // ── Disk via df ────────────────────────────────────────────────────────────

  private async collectDisks(): Promise<DiskInfo[]> {
    const WATCH_PATHS = [
      '/workspace',
      '/workspace/models',
      '/workspace/datasets',
      '/workspace/outputs',
      '/workspace/logs',
      '/',
    ]

    let stdout: string
    try {
      // Attempt 1: GNU df with --output (Linux)
      // Attempt 2: POSIX df -k (macOS / older Linux without --output)
      // Attempt 3: Just root fs
      // All attempts redirect stderr to /dev/null so missing paths don't cause failures
      ;({ stdout } = await execAsync(
        [
          `df -B1 --output=source,target,size,used,avail,pcent ${WATCH_PATHS.join(' ')} 2>/dev/null`,
          `df -k ${WATCH_PATHS.join(' ')} 2>/dev/null`,
          `df -k /`,
        ].join(' || '),
        { timeout: 10_000 }
      ))
    } catch {
      return []
    }

    const seen = new Set<string>()
    const disks: DiskInfo[] = []

    for (const line of stdout.trim().split('\n').slice(1)) {
      const parts = line.trim().split(/\s+/)
      if (parts.length < 5) continue

      // Detect format by whether the 6th column looks like a percentage
      // GNU --output: source  target        size   used   avail  pcent%
      // POSIX plain:  source  1024-blocks   used   avail  use%   mountpoint
      const isGnuOutput = parts.length >= 6 && /^\d+%$/.test(parts[5] ?? '')

      let source: string
      let target: string
      let sizeRaw: string
      let usedRaw: string
      let availRaw: string
      let pcentRaw: string

      if (isGnuOutput) {
        ;[source, target, sizeRaw, usedRaw, availRaw, pcentRaw] = parts as [
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      } else {
        // POSIX: Filesystem 1024-blocks Used Available Use% Mounted
        ;[source, sizeRaw, usedRaw, availRaw, pcentRaw, target] = parts as [
          string,
          string,
          string,
          string,
          string,
          string,
        ]
      }

      if (!target || seen.has(target)) continue
      seen.add(target)

      // POSIX df uses 1024-byte blocks when invoked with -k; GNU df -B1 uses bytes
      const blockSize = isGnuOutput ? 1 : 1024
      const totalBytes = (safeInt(sizeRaw) ?? 0) * blockSize
      const usedBytes = (safeInt(usedRaw) ?? 0) * blockSize
      const availBytes = (safeInt(availRaw) ?? 0) * blockSize
      const usedPct = safeInt(pcentRaw?.replace('%', '')) ?? 0

      if (totalBytes === 0) continue

      disks.push({
        source,
        mountpoint: target,
        totalBytes,
        usedBytes,
        availableBytes: availBytes,
        usedPercent: usedPct,
      })
    }

    return disks
  }
}
