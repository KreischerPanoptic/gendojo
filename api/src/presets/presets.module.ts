import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { PresetsController } from './presets.controller';
import { PresetsService } from './presets.service';
import { TrainingPreset } from './entity/preset.entity';

@Module({
  imports: [TypeOrmModule.forFeature([TrainingPreset])],
  controllers: [PresetsController],
  providers: [PresetsService],
  exports: [PresetsService],
})
export class PresetsModule {}