import {
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Post,
} from '@nestjs/common';
import { SystemService } from './system.service';
import type { SystemSnapshot } from './entities/system.types';

@Controller('system')
export class SystemController {
  constructor(private readonly systemService: SystemService) {}

  /**
   * GET /system
   * Возвращает последний кешированный снапшот (без ожидания).
   * Первые ~5 сек после старта может вернуть 404 — снапшот ещё не собран.
   */
  @Get()
  getSnapshot(): SystemSnapshot {
    const snapshot = this.systemService.getSnapshot();
    if (!snapshot) {
      throw new NotFoundException('System snapshot not yet available. Try again in a moment.');
    }
    return snapshot;
  }

  /**
   * POST /system/refresh
   * Немедленно запрашивает свежие данные и ждёт результата.
   * Используй когда нужны актуальные данные прямо сейчас (не ждать следующего poll).
   */
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(): Promise<SystemSnapshot> {
    return this.systemService.refresh();
  }

  /**
   * GET /system/gpu
   * Только GPU (быстрый фронтенд-запрос для шапки дашборда).
   */
  @Get('gpu')
  getGpu() {
    const snapshot = this.systemService.getSnapshot();
    if (!snapshot) {
      throw new NotFoundException('System snapshot not yet available.');
    }
    return {
      timestamp: snapshot.timestamp,
      gpus: snapshot.gpus,
    };
  }

  /**
   * GET /system/memory
   * Только RAM.
   */
  @Get('memory')
  getMemory() {
    const snapshot = this.systemService.getSnapshot();
    if (!snapshot) {
      throw new NotFoundException('System snapshot not yet available.');
    }
    return {
      timestamp: snapshot.timestamp,
      memory: snapshot.memory,
    };
  }

  /**
   * GET /system/disks
   * Только дисковое пространство.
   */
  @Get('disks')
  getDisks() {
    const snapshot = this.systemService.getSnapshot();
    if (!snapshot) {
      throw new NotFoundException('System snapshot not yet available.');
    }
    return {
      timestamp: snapshot.timestamp,
      disks: snapshot.disks,
    };
  }
}