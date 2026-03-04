import { Module } from '@nestjs/common';
import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { PathsConfig } from '../config/paths.config';
import { SettingsModule } from '../system/settings/settings.module';

@Module({
  imports: [
      SettingsModule
    ],
  controllers: [DatasetsController],
  providers: [DatasetsService, PathsConfig],
  exports: [DatasetsService],
})
export class DatasetsModule {}