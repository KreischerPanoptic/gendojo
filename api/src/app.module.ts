import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
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
import { join } from 'path';
import { DownloaderModule } from './downloader/downloader.module';
import { TokensModule } from './tokens/tokens.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/*path'],   // ← вместо '/api/(.*)'
    }),
    JobsModule,
    ModelsModule,
    SystemModule,
    SettingsModule,
    TomlModule,
    ConfigModule,
    DatasetsModule,
    AuthModule,
    DownloaderModule,
    TokensModule
  ],
  controllers: [],
  providers: [TomlService, ModelsService],
})
export class AppModule {}
