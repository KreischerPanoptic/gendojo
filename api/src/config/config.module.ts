import { Global, Module } from '@nestjs/common';
import { PathsConfig } from './paths.config';
import { SettingsModule } from '../settings/settings.module';

@Global()  // ← делает PathsConfig доступным везде без повторных импортов
@Module({
  imports: [SettingsModule],
  providers: [PathsConfig],
  exports: [PathsConfig],
})
export class ConfigModule {}