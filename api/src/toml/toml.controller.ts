import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import { TomlService } from './toml.service';
import { validateTrainConfig } from '../utils/toml';
import type { ValidationResult } from '../utils/toml';
import type { TrainTomlDto } from './dto/train-toml.dto';
import type { DatasetTomlDto } from './dto/dataset-toml.dto';

/**
 * TOML preview controller.
 *
 * All endpoints are read-only — they generate TOML strings in-memory and
 * return them to the client WITHOUT writing to disk or spawning anything.
 * Disk writes + process spawn happen later in JobsService.
 *
 * Routes
 *   POST /toml/preview/dataset   → dataset.toml string
 *   POST /toml/preview/train     → train.toml string + validation
 *   POST /toml/validate/train    → validation result only (no TOML generated)
 */
@Controller('toml')
export class TomlController {
  constructor(private readonly tomlService: TomlService) {}

  /**
   * POST /toml/preview/dataset
   *
   * Generate a dataset.toml string from the provided DTO.
   * Useful for the UI's "Preview Config" button before creating a job.
   *
   * Body: DatasetTomlDto
   * Returns: { toml: string }
   */
  @Post('preview/dataset')
  @HttpCode(HttpStatus.OK)
  previewDataset(@Body() dto: DatasetTomlDto): { toml: string } {
    const toml = this.tomlService.generateDatasetToml(dto);
    return { toml };
  }

  /**
   * POST /toml/preview/train
   *
   * Validate + generate a train.toml string.
   * Returns 422 if validation fails so the UI can show field-level errors
   * before the user submits a job.
   *
   * Body: TrainTomlDto  (arch discriminator selects the correct variant)
   * Returns: { toml: string; script: string; networkModule: string }
   */
  @Post('preview/train')
  @HttpCode(HttpStatus.OK)
  previewTrain(@Body() dto: TrainTomlDto): {
    toml: string;
    script: string;
    networkModule: string;
  } {
    const validation = validateTrainConfig(dto);
    if (!validation.valid) {
      throw new UnprocessableEntityException({
        message: 'Train config validation failed',
        errors: validation.errors,
      });
    }

    const toml = this.tomlService.generateTrainToml(dto);
    const script = this.tomlService.getTrainScript(dto.arch);
    const networkModule = this.tomlService.getDefaultNetworkModule(dto.arch);

    return { toml, script, networkModule };
  }

  /**
   * POST /toml/validate/train
   *
   * Run arch-aware validation without generating TOML.
   * Always returns 200; the `valid` field indicates success.
   * Used by the UI for real-time field validation.
   *
   * Body: TrainTomlDto
   * Returns: ValidationResult  { valid: boolean; errors: ValidationError[] }
   */
  @Post('validate/train')
  @HttpCode(HttpStatus.OK)
  validateTrain(@Body() dto: TrainTomlDto): ValidationResult {
    return validateTrainConfig(dto);
  }
}