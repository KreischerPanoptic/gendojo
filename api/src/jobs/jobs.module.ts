import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobsGateway } from './jobs.gateway';
import { TomlModule } from '../toml/toml.module';
import { PathsConfig } from '../config/paths.config';
import { SettingsModule } from '../system/settings/settings.module';
import { DatasetsModule } from '../datasets/datasets.module';

@Module({
  imports: [
    TomlModule,   // provides TomlService (generateDatasetToml, generateTrainToml, getTrainScript)
    DatasetsModule,
    SettingsModule
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobsGateway,
    PathsConfig,  // not a global module — explicit injection per GenDojo convention
  ],
  exports: [JobsService],
})
export class JobsModule {}