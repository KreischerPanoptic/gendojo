import { Module } from '@nestjs/common';
import { DownloaderController } from './downloader.controller';
import { DownloaderService } from './downloader.service';
import { PathsConfig } from '../config/paths.config';
import { ModelsModule } from '../models/models.module';
import { SettingsModule } from 'src/system/settings/settings.module';

@Module({
  imports: [
    // ModelsModule is imported so we can inject ModelsService for .refresh()
    // after a download completes.
    ModelsModule,
    SettingsModule
  ],
  controllers: [DownloaderController],
  providers: [DownloaderService, PathsConfig],
})
export class DownloaderModule {}