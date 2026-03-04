import {
  Body,
  Controller,
  Get,
  Put,
} from '@nestjs/common';
import { SettingsService } from './settings.service';
import type { AppSettings } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';

@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(): AppSettings {
    return this.settingsService.getSettings();
  }

  @Put()
  updateSettings(@Body() dto: UpdateSettingsDto): AppSettings {
    return this.settingsService.update(dto);
  }
}