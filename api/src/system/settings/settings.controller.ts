import {
  Body,
  Controller,
  Get,
  Put,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import type { AppSettings } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { PathsConfig } from '../../config/paths.config';
import type { PathsInfo } from './types/settings.types';
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
  getSettings(): AppSettings {
    return this.settingsService.getSettings();
  }

  /**
   * GET /settings/paths
   * Resolved absolute paths for all workspace volumes.
   * Consumed by the frontend to build default output_dir, image_dir, etc.
   * Includes static paths (accelerateConfig, temp) that are not editable via UI.
   */
  @Get('paths')
  getPaths(): PathsInfo {
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
  updateSettings(@Body() dto: UpdateSettingsDto): AppSettings {
    return this.settingsService.update(dto);
  }
}