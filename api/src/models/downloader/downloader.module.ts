import { Module } from '@nestjs/common';
import { DownloaderController } from './downloader.controller';
import { DownloaderService } from './downloader.service';
import { PathsConfig } from '../../config/paths.config';
import { ModelsModule } from '../models.module';
import { SettingsModule } from 'src/system/settings/settings.module';

@Module({
  imports: [
    ModelsModule,
    SettingsModule
  ],
  controllers: [DownloaderController],
  providers: [DownloaderService, PathsConfig],
})
export class DownloaderModule {}