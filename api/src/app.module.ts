import { Module } from '@nestjs/common';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JobsModule } from './jobs/jobs.module';
import { TomlService } from './toml/toml.service';
import { ModelsService } from './models/models.service';
import { ModelsModule } from './models/models.module';
import { TomlModule } from './toml/toml.module';
import { SystemModule } from './system/system.module';
import { ConfigModule } from './config/config.module';
import { DatasetsModule } from './datasets/datasets.module';
import { AuthModule } from './auth/auth.module';
import { SettingsModule } from './settings/settings.module';
import { join } from 'path';
import { DownloaderModule } from './downloader/downloader.module';
import { TokensModule } from './tokens/tokens.module';
import { OutputsModule } from './jobs/outputs/outputs.module';
import { PresetsModule } from './presets/presets.module';

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api/*path'],
    }),
    TypeOrmModule.forRoot({
      type: "better-sqlite3",
      database: "../dojo.sqlite3",
      entities: [__dirname + "/**/*.entity{.ts,.js}"],
      synchronize: process.env.NODE_ENV !== 'production',
      statementCacheSize: 100,
      prepareDatabase: (db) => {
        db.pragma('journal_mode = WAL');
        db.pragma('synchronous = NORMAL');
        db.pragma('busy_timeout = 5000');
      },
    }),
    NestConfigModule,
    JobsModule,
    OutputsModule,
    PresetsModule,
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
export class AppModule { }
