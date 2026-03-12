import { Module } from '@nestjs/common';
import { JobsController } from './jobs.controller';
import { JobsService } from './jobs.service';
import { JobsGateway } from './jobs.gateway';
import { TomlModule } from '../toml/toml.module';
import { PathsConfig } from '../config/paths.config';
import { SettingsModule } from '../settings/settings.module';
import { DatasetsModule } from '../datasets/datasets.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Job } from './entities/job.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Job]),
    TomlModule,
    DatasetsModule,
    SettingsModule
  ],
  controllers: [JobsController],
  providers: [
    JobsService,
    JobsGateway,
    PathsConfig,
  ],
  exports: [JobsService],
})
export class JobsModule {}