import {
  Body,
  Controller,
  Get,
  Put,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { PathsConfig } from '../config/paths.config';
import type { PathsDto } from './dto/paths.dto';
import type { SettingsDto } from './dto/settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly pathsConfig: PathsConfig,
  ) {}

  /**
   * GET /settings
   * Full settings object (paths + training constants).
   */
  @Get()
  getSettings(): SettingsDto {
    return this.settingsService.getSettings();
  }

  /**
   * GET /settings/paths
   * Resolved absolute paths for all workspace volumes.
   * Consumed by the frontend to build default output_dir, image_dir, etc.
   * Includes static paths (accelerateConfig, temp) that are not editable via UI.
   */
  @Get('paths')
  getPaths(): PathsDto {
    const p = this.settingsService.getPaths();
    return {
      models:           p.models,
      datasets:         p.datasets,
      outputs:          p.outputs,
      logs:             p.logs,
      sdScripts:        p.sdScripts,
      accelerateConfig: this.pathsConfig.accelerateConfig,
      temp:             this.pathsConfig.temp,
    };
  }

  /**
   * PUT /settings
   * Update editable settings (paths + training constants).
   */
  @Put()
  async updateSettings(@Body() dto: UpdateSettingsDto): Promise<SettingsDto> {
    return await this.settingsService.update(dto);
  }
}