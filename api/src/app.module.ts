import { Module } from "@nestjs/common";
import { ServeStaticModule } from "@nestjs/serve-static";
import { TypeOrmModule } from "@nestjs/typeorm";
import { join } from "path";

import { JobsModule } from "./jobs/jobs.module";
import { OutputsModule } from "./jobs/outputs/outputs.module";
import { PresetsModule } from "./presets/presets.module";
import { ModelsModule } from "./models/models.module";
import { SystemModule } from "./system/system.module";
import { SettingsModule } from "./settings/settings.module";
import { TomlModule } from "./toml/toml.module";
import { ConfigModule } from "./config/config.module";
import { DatasetsModule } from "./datasets/datasets.module";
import { AuthModule } from "./auth/auth.module";
import { DownloaderModule } from "./downloader/downloader.module";
import { TokensModule } from "./settings/tokens/tokens.module";
import { TomlService } from "./toml/toml.service";
import { ModelsService } from "./models/models.service";

/**
 * Database path strategy:
 *   - In Docker / RunPod: DB_PATH env var points to a persistent volume,
 *     e.g. /workspace/dojo.sqlite3
 *   - In local dev: falls back to <repo-root>/dojo.sqlite3
 *
 * synchronize: true — always on. For a single-GPU pet project with no
 * concurrent migrations this is fine. TypeORM's synchronize is safe for
 * additive schema changes (new columns/tables). If a breaking migration is
 * ever needed, handle it manually and temporarily set synchronize: false.
 */
const DB_PATH =
  process.env["DB_PATH"] ?? join(__dirname, "..", "..", "dojo.sqlite3"); // api/dist/../../ → repo root

@Module({
  imports: [
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, "..", "public"),
      exclude: ["/api/*path"],
    }),

    TypeOrmModule.forRoot({
      type: "sqlite",
      database: DB_PATH,
      // Glob covers both ts-node (src/) and compiled (dist/) environments
      entities: [join(__dirname, "**", "*.entity.{ts,js}")],
      synchronize: true,
      // statementCacheSize: 100,
      // prepareDatabase: (db) => {
      //   db.pragma('journal_mode = WAL');
      //   db.pragma('synchronous = NORMAL');
      //   db.pragma('busy_timeout = 5000');
      // },
    }),
    SettingsModule,
    ConfigModule,
    JobsModule,
    OutputsModule,
    PresetsModule,
    ModelsModule,
    SystemModule,
    TomlModule,
    DatasetsModule,
    AuthModule,
    DownloaderModule,
    TokensModule,
  ],
  controllers: [],
  providers: [TomlService, ModelsService],
})
export class AppModule {}
