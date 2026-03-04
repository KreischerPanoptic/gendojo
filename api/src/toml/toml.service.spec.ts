import { Test, TestingModule } from '@nestjs/testing';
import { TomlService } from './toml.service';

describe('TomlService', () => {
  let service: TomlService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TomlService],
    }).compile();

    service = module.get<TomlService>(TomlService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
