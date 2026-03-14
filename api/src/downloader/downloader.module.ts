import { Module } from '@nestjs/common';
import { DownloaderController } from './downloader.controller';
import { DownloaderService } from './downloader.service';
import { ModelsModule } from '../models/models.module';
import { TokensModule } from '../settings/tokens/tokens.module';

/**
 * PathsConfig is provided by @Global() ConfigModule — no need to declare it here.
 * TokensService is exported from TokensModule — import the module, not the service directly.
 */
@Module({
  imports: [
    ModelsModule,
    TokensModule,
  ],
  controllers: [DownloaderController],
  providers: [DownloaderService],
})
export class DownloaderModule {}