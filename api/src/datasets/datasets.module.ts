import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { DatasetsController } from './datasets.controller';
import { DatasetsService } from './datasets.service';
import { DatasetMetadata } from './entities/dataset-metadata.entity';
import { PathsConfig } from '../config/paths.config';
import { SettingsModule } from '../settings/settings.module';

@Module({
  imports: [
    SettingsModule,
    TypeOrmModule.forFeature([DatasetMetadata]),
  ],
  controllers: [DatasetsController],
  providers: [DatasetsService, PathsConfig],
  exports: [DatasetsService],
})
export class DatasetsModule {}