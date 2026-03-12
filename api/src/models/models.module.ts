import { Module } from '@nestjs/common';
import { ModelsController } from './models.controller';
import { ModelsService } from './models.service';
import { PathsConfig } from '../config/paths.config';
import { SettingsModule } from '../settings/settings.module';

@Module({
  controllers: [ModelsController],
  imports: [SettingsModule],
  providers: [ModelsService, PathsConfig],
  exports: [ModelsService],
})
export class ModelsModule {}