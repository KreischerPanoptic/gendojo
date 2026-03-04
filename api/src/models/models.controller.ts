import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  NotFoundException,
} from '@nestjs/common';
import {
  ModelsService,
} from './models.service';
import type {
  ModelArchitecture,
  ModelType,
  ModelRole,
} from './models.service';

@Controller('models')
export class ModelsController {
  constructor(private readonly modelsService: ModelsService) {}

  /**
   * GET /models
   * GET /models?arch=flux
   * GET /models?type=text_encoder
   * GET /models?role=clip_l
   * GET /models?arch=flux&role=dit
   */
  @Get()
  list(
    @Query('arch') arch?: ModelArchitecture,
    @Query('type') type?: ModelType,
    @Query('role') role?: ModelRole,
  ) {
    return this.modelsService.list({ arch, type, role });
  }

  /** POST /models/refresh — re-scan disk and rebuild cache */
  @Post('refresh')
  async refresh() {
    const models = await this.modelsService.refresh();
    return { count: models.length };
  }

  /** GET /models/flux%2Fclip_l.safetensors  (id is URL-encoded relative path) */
  @Get('*path')
  getOne(@Param('id') id: string) {
    const model = this.modelsService.getById(id);
    if (!model) throw new NotFoundException(`Model not found: ${id}`);
    return model;
  }
}