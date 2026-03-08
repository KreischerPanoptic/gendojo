import { Test, TestingModule } from '@nestjs/testing';
import { TomlController } from './toml.controller';
import { TomlService } from './toml.service';

describe('TomlController', () => {
  let controller: TomlController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TomlController],
      providers: [TomlService],
    }).compile();

    controller = module.get<TomlController>(TomlController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
