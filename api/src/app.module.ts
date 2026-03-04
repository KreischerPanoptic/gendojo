import { Module } from '@nestjs/common';
import { JobsModule } from './jobs/jobs.module';
import { TomlService } from './toml/toml.service';
import { ModelsService } from './models/models.service';
import { ModelsModule } from './models/models.module';
import { TomlModule } from './toml/toml.module';
import { SystemModule } from './system/system.module';
import { ConfigModule } from './config/config.module';
import { DatasetsModule } from './datasets/datasets.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './system/settings/settings.module';

@Module({
  imports: [JobsModule, ModelsModule, SystemModule, SettingsModule, TomlModule, ConfigModule, DatasetsModule, AuthModule],
  controllers: [],
  providers: [TomlService, ModelsService],
})
export class AppModule {}
