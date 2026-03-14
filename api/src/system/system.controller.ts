import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';

import { SystemService } from './system.service';
import { SystemSnapshotDto } from './dto/system';
import { GpuSnapshotDto } from './dto/gpu';
import { MemorySnapshotDto } from './dto/memory';
import { DisksSnapshotDto } from './dto/disks';

/**
 * GET    /system         — full cached snapshot (GPU, CPU, RAM, disks)
 * POST   /system/refresh — force immediate re-collection and return result
 * GET    /system/gpu     — GPU slice only (lightweight dashboard header poll)
 * GET    /system/memory  — RAM slice only
 * GET    /system/disks   — disk usage slice only
 */
@ApiTags('System')
@ApiBearerAuth()
@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  /**
   * GET /system
   *
   * Returns the last cached snapshot without triggering a new collection.
   * Latency is O(1) — data is ready immediately after the first poll (~5 s after startup).
   * Returns 404 for the first few seconds before the initial poll completes.
   */
  @Get()
  @ApiOperation({
    summary: 'Get cached system snapshot',
    description:
      'Returns the most recently collected system metrics (GPU, CPU, RAM, disks). ' +
      'No I/O is performed — data is served from the in-memory cache updated every 5 seconds. ' +
      'Returns 404 briefly on startup before the first poll completes.',
  })
  @ApiResponse({ status: 200, description: 'Current system snapshot', type: SystemSnapshotDto })
  @ApiResponse({ status: 404, description: 'Snapshot not yet available (startup race)' })
  getSnapshot(): SystemSnapshotDto {
    const snapshot = this.systemService.getSnapshot();
    if (!snapshot) {
      throw new NotFoundException('System snapshot not yet available. Try again in a moment.');
    }
    return snapshot;
  }

  /**
   * POST /system/refresh
   *
   * Forces an immediate re-collection and waits for the result.
   * Useful when fresh data is needed right now rather than on the next 5-second tick.
   * If a poll is already in progress, waits for it to complete.
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Force an immediate system metrics refresh',
    description:
      'Triggers a fresh collection of all system metrics (GPU, CPU, RAM, disks) ' +
      'and returns the result synchronously. ' +
      'Use this when you need up-to-date data immediately rather than waiting for the next poll cycle.',
  })
  @ApiResponse({ status: 200, description: 'Freshly collected snapshot', type: SystemSnapshotDto })
  async refresh(): Promise<SystemSnapshotDto> {
    return this.systemService.refresh();
  }

  /**
   * GET /system/gpu
   *
   * GPU-only slice of the snapshot for lightweight dashboard header polling.
   * Returns an empty gpus array when nvidia-smi is unavailable.
   */
  @Get('gpu')
  @ApiOperation({
    summary: 'Get GPU metrics only',
    description:
      'Lightweight endpoint returning only GPU data from the cached snapshot. ' +
      'Suitable for high-frequency polling in the dashboard header. ' +
      'Returns an empty gpus array when no NVIDIA GPU is detected.',
  })
  @ApiResponse({ status: 200, description: 'GPU snapshot', type: GpuSnapshotDto })
  @ApiResponse({ status: 404, description: 'Snapshot not yet available' })
  getGpu(): GpuSnapshotDto {
    const snapshot = this.systemService.getSnapshot();
    if (!snapshot) throw new NotFoundException('System snapshot not yet available.');
    return { timestamp: snapshot.timestamp, gpus: snapshot.gpus };
  }

  /**
   * GET /system/memory
   *
   * RAM-only slice for widgets that display memory usage independently.
   */
  @Get('memory')
  @ApiOperation({
    summary: 'Get RAM metrics only',
    description: 'Returns only the memory section of the cached system snapshot.',
  })
  @ApiResponse({ status: 200, description: 'Memory snapshot', type: MemorySnapshotDto })
  @ApiResponse({ status: 404, description: 'Snapshot not yet available' })
  getMemory(): MemorySnapshotDto {
    const snapshot = this.systemService.getSnapshot();
    if (!snapshot) throw new NotFoundException('System snapshot not yet available.');
    return { timestamp: snapshot.timestamp, memory: snapshot.memory };
  }

  /**
   * GET /system/disks
   *
   * Disk usage for all monitored mount points (/workspace/* and /).
   */
  @Get('disks')
  @ApiOperation({
    summary: 'Get disk usage metrics',
    description:
      'Returns disk utilisation for all monitored paths (/workspace, /workspace/models, ' +
      '/workspace/datasets, /workspace/outputs, /workspace/logs, /). ' +
      'Duplicates are deduplicated by mount point.',
  })
  @ApiResponse({ status: 200, description: 'Disk snapshot', type: DisksSnapshotDto })
  @ApiResponse({ status: 404, description: 'Snapshot not yet available' })
  getDisks(): DisksSnapshotDto {
    const snapshot = this.systemService.getSnapshot();
    if (!snapshot) throw new NotFoundException('System snapshot not yet available.');
    return { timestamp: snapshot.timestamp, disks: snapshot.disks };
  }
}