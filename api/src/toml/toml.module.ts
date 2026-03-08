import { Module } from '@nestjs/common';
import { TomlService } from './toml.service';
import { TomlController } from './toml.controller';

@Module({
  controllers: [TomlController],
  providers: [TomlService],
  exports: [TomlService],
})
export class TomlModule {}
