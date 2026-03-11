import { Module } from '@nestjs/common';
import { DownloaderController } from './downloader.controller';
import { DownloaderService } from './downloader.service';
import { PathsConfig } from '../../config/paths.config';
import { ModelsModule } from '../models.module';
import { SettingsModule } from 'src/system/settings/settings.module';
import { TokensModule } from 'src/tokens/tokens.module';
import { TokensService } from 'src/tokens/tokens.service';

@Module({
  imports: [
    ModelsModule,
    SettingsModule,
    TokensModule
  ],
  controllers: [DownloaderController],
  providers: [DownloaderService, PathsConfig, TokensService],
})
export class DownloaderModule {}