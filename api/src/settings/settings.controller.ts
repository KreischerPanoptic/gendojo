import { Body, Controller, Get, HttpCode, HttpStatus, Put } from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';

import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsDto } from './dto/settings.dto';
import { PathsDto } from './dto/paths.dto';

/**
 * GET  /settings        — full settings object
 * GET  /settings/paths  — all resolved absolute paths
 * PUT  /settings        — update any combination of paths / training / theme
 */
@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get full settings',
    description: 'Returns all persisted settings as stored in the DB.',
  })
  @ApiResponse({ status: 200, description: 'Current settings', type: SettingsDto })
  getSettings(): SettingsDto {
    return this.settingsService.getSettings();
  }

  /**
   * GET /settings/paths
   *
   * Convenience endpoint — returns only the resolved path values.
   * Consumed by the frontend to pre-fill default output_dir, image_dir, etc.
   * Includes all 7 paths: models, datasets, outputs, logs, sdScripts,
   * accelerateConfig and temp.
   */
  @Get('paths')
  @ApiOperation({
    summary: 'Get all resolved workspace paths',
    description:
      'Includes static paths (accelerateConfig, temp) that are editable via PUT /settings. ' +
      'All values are absolute paths reflecting the current DB state.',
  })
  @ApiResponse({ status: 200, description: 'Resolved paths', type: PathsDto })
  getPaths(): PathsDto {
    // SettingsService.getPaths() is now the single source of truth for all 7 paths
    return this.settingsService.getPaths();
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Update settings',
    description:
      'Partial update — only provided fields are changed. ' +
      'Changes take effect immediately (in-memory cache is updated synchronously).',
  })
  @ApiBody({ type: UpdateSettingsDto })
  @ApiResponse({ status: 200, description: 'Updated settings', type: SettingsDto })
  @ApiResponse({ status: 400, description: 'Validation error' })
  async updateSettings(@Body() dto: UpdateSettingsDto): Promise<SettingsDto> {
    return this.settingsService.update(dto);
  }
}