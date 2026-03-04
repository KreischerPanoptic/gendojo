import { Module } from '@nestjs/common';
import { JobsModule } from './jobs/jobs.module';
import { TomlService } from './toml/toml.service';
import { ModelsService } from './models/models.service';
import { ModelsModule } from './models/models.module';
import { SystemModule } from './system/system.module';

@Module({
  imports: [JobsModule, ModelsModule, SystemModule],
  controllers: [],
  providers: [TomlService, ModelsService],
})
export class AppModule {}
