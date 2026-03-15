import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiBody,
  ApiResponse,
  ApiExtraModels,
  getSchemaPath,
} from '@nestjs/swagger';

import { TomlService } from './toml.service';
import { validateTrainConfig } from '../utils/toml';
import type { TrainTomlDto } from './dto/train-toml.dto';
import type { DatasetTomlDto } from './dto/dataset-toml.dto';
import { ValidationErrorDto, ValidationResultDto } from './dto/validation-error.dto';
import { DatasetTomlPreviewResponseDto } from './dto/dataset-toml-preview.dto';
import { TrainTomlPreviewResponseDto } from './dto/train-toml-preview.dto';

/**
 * TOML preview and validation endpoints.
 *
 * All endpoints are read-only — they generate or validate TOML in-memory
 * and return results to the client WITHOUT writing to disk or spawning anything.
 * Disk writes and process spawn happen later in JobsService.
 *
 * POST /toml/preview/dataset   → generated dataset.toml string
 * POST /toml/preview/train     → generated train.toml string + validation
 * POST /toml/validate/train    → validation result only (no TOML generated)
 */
@ApiTags('TOML')
@ApiBearerAuth()
@ApiExtraModels(ValidationErrorDto, ValidationResultDto)
@Controller('toml')
export class TomlController {
  constructor(private readonly tomlService: TomlService) {}

  /**
   * POST /toml/preview/dataset
   *
   * Generate a dataset.toml string from the provided DTO.
   * Useful for the UI's "Preview Config" button before creating a job.
   * No validation is performed — sd-scripts will catch TOML errors at launch.
   */
  @Post('preview/dataset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Generate dataset.toml from a dataset config DTO',
    description:
      'Serialises the provided DatasetTomlDto to a TOML string compatible with ' +
      'sd-scripts --dataset_config. ' +
      'Supports mixed DreamBooth and fine-tuning subsets across multiple datasets. ' +
      'No validation is performed here — use POST /toml/validate/train for pre-flight checks.',
  })
  @ApiBody({
    description: 'Dataset config — one or more datasets, each with one or more subsets',
    schema: {
      type: 'object',
      properties: {
        general: {
          type: 'object',
          description:
            'Global defaults applied to all datasets and subsets. ' +
            'Overridable at dataset or subset level. All fields optional.',
          properties: {
            resolution:          { oneOf: [{ type: 'integer' }, { type: 'array', items: { type: 'integer' }, minItems: 2, maxItems: 2 }], example: 1024 },
            batch_size:          { type: 'integer', example: 1 },
            enable_bucket:       { type: 'boolean', example: true },
            min_bucket_reso:     { type: 'integer', example: 256 },
            max_bucket_reso:     { type: 'integer', example: 2048 },
            bucket_reso_steps:   { type: 'integer', example: 64 },
            bucket_no_upscale:   { type: 'boolean', example: false },
            shuffle_caption:     { type: 'boolean', example: true },
            keep_tokens:         { type: 'integer', example: 1 },
            keep_tokens_separator: { type: 'string', example: '|||' },
            secondary_separator: { type: 'string', example: ';;;' },
            enable_wildcard:     { type: 'boolean', example: false },
            flip_aug:            { type: 'boolean', example: false, description: 'Disabled when cache_latents is set' },
            color_aug:           { type: 'boolean', example: false, description: 'Disabled when cache_latents is set' },
            random_crop:         { type: 'boolean', example: false, description: 'Disabled when cache_latents is set' },
            face_crop_aug_range: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, example: [1.0, 3.0] },
            caption_prefix:      { type: 'string', example: 'masterpiece, best quality, ' },
            caption_suffix:      { type: 'string', example: ', from side' },
            caption_separator:   { type: 'string', example: ',' },
            caption_extension:   { type: 'string', example: '.txt', description: 'DreamBooth: caption file extension' },
            cache_info:          { type: 'boolean', example: false, description: 'DreamBooth: cache image/caption metadata' },
            conditioning_data_dir: { type: 'string', description: 'DreamBooth: directory with mask images for masked loss' },
            alpha_mask:          { type: 'boolean', example: false, description: 'DreamBooth: use image alpha channel as loss mask' },
            resize_interpolation:{ type: 'string', enum: ['lanczos','nearest','bilinear','linear','bicubic','cubic','area','box'] },
            num_repeats:         { type: 'integer', example: 10 },
            caption_dropout_every_n_epochs: { type: 'integer', example: 0 },
            caption_dropout_rate:           { type: 'number', example: 0.0 },
            caption_tag_dropout_rate:       { type: 'number', example: 0.0 },
            validation_split:               { type: 'number', example: 0.0 },
          },
        },
        datasets: {
          type: 'array',
          description: 'One or more dataset definitions. Each dataset has its own resolution and batch size.',
          minItems: 1,
          items: {
            type: 'object',
            required: ['subsets'],
            properties: {
              resolution:    { oneOf: [{ type: 'integer' }, { type: 'array', items: { type: 'integer' }, minItems: 2, maxItems: 2 }], example: 1024 },
              batch_size:    { type: 'integer', example: 1 },
              enable_bucket: { type: 'boolean', example: true },
              subsets: {
                type: 'array',
                minItems: 1,
                items: {
                  type: 'object',
                  description:
                    'DreamBooth subset (image_dir required, no metadata_file) OR ' +
                    'fine-tuning subset (metadata_file required). ' +
                    'sd-scripts determines the method from presence of metadata_file.',
                  properties: {
                    image_dir:      { type: 'string', example: '/workspace/datasets/my_char' },
                    metadata_file:  { type: 'string', example: '/workspace/datasets/my_char/metadata.json', description: 'Fine-tuning only — presence determines method' },
                    class_tokens:   { type: 'string', example: 'my char', description: 'DreamBooth only — used when no caption file exists' },
                    caption_extension: { type: 'string', example: '.txt' },
                    num_repeats:    { type: 'integer', example: 10 },
                    is_reg:         { type: 'boolean', example: false, description: 'DreamBooth only — regularisation images' },
                    flip_aug:       { type: 'boolean', example: false },
                    color_aug:      { type: 'boolean', example: false },
                    random_crop:    { type: 'boolean', example: false },
                    face_crop_aug_range: { type: 'array', items: { type: 'number' }, minItems: 2, maxItems: 2, example: [1.0, 3.0] },
                    shuffle_caption: { type: 'boolean', example: true },
                    keep_tokens:    { type: 'integer', example: 1 },
                    cache_info:     { type: 'boolean', example: false },
                    conditioning_data_dir: { type: 'string' },
                    alpha_mask:     { type: 'boolean', example: false },
                  },
                },
              },
            },
          },
        },
      },
      required: ['datasets'],
    },
  })
  @ApiResponse({ status: 200, description: 'Generated dataset.toml', type: DatasetTomlPreviewResponseDto })
  previewDataset(@Body() dto: DatasetTomlDto): DatasetTomlPreviewResponseDto {
    const toml = this.tomlService.generateDatasetToml(dto);
    return { toml };
  }

  /**
   * POST /toml/preview/train
   *
   * Validate + generate a train.toml string.
   * Returns 422 with field-level errors if validation fails.
   * The `arch` discriminator selects the correct variant of TrainTomlDto.
   */
  @Post('preview/train')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate and generate train.toml from a training config DTO',
    description:
      'Runs arch-aware validation, then serialises the DTO to a TOML string compatible with ' +
      'sd-scripts --config_file. The `arch` field selects the correct architecture variant and ' +
      'is stripped from the output (it is not a valid sd-scripts argument). ' +
      '`network_module` defaults to the architecture default when not explicitly provided. ' +
      'Returns 422 with field-level validation errors when the config is invalid.',
  })
  @ApiBody({
    description:
      'Architecture-discriminated training config. ' +
      'The `arch` field determines which required/optional fields apply. ' +
      'Use POST /toml/validate/train for real-time validation without generating output.',
    schema: {
      oneOf: [
        { title: 'FluxTrainDto',    description: 'FLUX.1 — flux_train_network.py',             properties: { arch: { type: 'string', enum: ['flux']    } }, required: ['arch', 'pretrained_model_name_or_path', 'clip_l', 't5xxl', 'ae', 'network_dim', 'learning_rate', 'optimizer_type', 'output_dir', 'output_name', 'dataset_config'] },
        { title: 'ChromaTrainDto',  description: 'Chroma — flux_train_network.py + model_type=chroma', properties: { arch: { type: 'string', enum: ['chroma']  } }, required: ['arch', 'pretrained_model_name_or_path', 't5xxl', 'ae', 'network_dim', 'learning_rate', 'optimizer_type', 'output_dir', 'output_name', 'dataset_config'] },
        { title: 'Sd3TrainDto',     description: 'SD3/SD3.5 — sd3_train_network.py',           properties: { arch: { type: 'string', enum: ['sd3']     } }, required: ['arch', 'pretrained_model_name_or_path', 'network_dim', 'learning_rate', 'optimizer_type', 'output_dir', 'output_name', 'dataset_config'] },
        { title: 'SdxlTrainDto',    description: 'SDXL — sdxl_train_network.py',               properties: { arch: { type: 'string', enum: ['sdxl']    } }, required: ['arch', 'pretrained_model_name_or_path', 'network_dim', 'learning_rate', 'optimizer_type', 'output_dir', 'output_name', 'dataset_config'] },
        { title: 'Sd1TrainDto',     description: 'SD1.x — train_network.py',                   properties: { arch: { type: 'string', enum: ['sd1']     } }, required: ['arch', 'pretrained_model_name_or_path', 'network_dim', 'learning_rate', 'optimizer_type', 'output_dir', 'output_name', 'dataset_config'] },
        { title: 'Sd2TrainDto',     description: 'SD2.x — train_network.py',                   properties: { arch: { type: 'string', enum: ['sd2']     } }, required: ['arch', 'pretrained_model_name_or_path', 'network_dim', 'learning_rate', 'optimizer_type', 'output_dir', 'output_name', 'dataset_config'] },
        { title: 'AnimaTrainDto',   description: 'Anima — anima_train_network.py',             properties: { arch: { type: 'string', enum: ['anima']   } }, required: ['arch', 'pretrained_model_name_or_path', 'qwen3', 'vae', 'network_dim', 'learning_rate', 'optimizer_type', 'output_dir', 'output_name', 'dataset_config'] },
        { title: 'LuminaTrainDto',  description: 'Lumina Image 2.0 — lumina_train_network.py', properties: { arch: { type: 'string', enum: ['lumina']  } }, required: ['arch', 'pretrained_model_name_or_path', 'gemma2', 'ae', 'network_dim', 'learning_rate', 'optimizer_type', 'output_dir', 'output_name', 'dataset_config'] },
        { title: 'HunyuanTrainDto', description: 'HunyuanImage 2.1 — hunyuan_image_train_network.py', properties: { arch: { type: 'string', enum: ['hunyuan'] } }, required: ['arch', 'pretrained_model_name_or_path', 'text_encoder', 'byt5', 'vae', 'network_dim', 'learning_rate', 'optimizer_type', 'output_dir', 'output_name', 'dataset_config'] },
      ],
    },
  })
  @ApiResponse({ status: 200, description: 'Generated train.toml + resolved script and network module', type: TrainTomlPreviewResponseDto })
  @ApiResponse({
    status: 422,
    description: 'Train config validation failed — body contains field-level errors',
    schema: {
      properties: {
        message: { type: 'string', example: 'Train config validation failed' },
        errors: {
          type: 'array',
          items: { $ref: getSchemaPath(ValidationErrorDto) },
        },
      },
    },
  })
  previewTrain(@Body() dto: TrainTomlDto): TrainTomlPreviewResponseDto {
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
   * Always returns 200 — the `valid` field indicates success.
   * Used by the UI for real-time field validation as the user types.
   */
  @Post('validate/train')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Validate a training config without generating TOML',
    description:
      'Runs the same arch-aware validation as POST /toml/preview/train ' +
      'but returns only the validation result without serialising to TOML. ' +
      'Always returns HTTP 200 — check the `valid` field. ' +
      'Designed for real-time UI validation as the user fills out the training form.',
  })
  @ApiBody({
    description: 'Architecture-discriminated training config (same shape as POST /toml/preview/train)',
    schema: {
      type: 'object',
      required: ['arch'],
      properties: {
        arch: {
          type: 'string',
          enum: ['sd1', 'sd2', 'sdxl', 'flux', 'chroma', 'sd3', 'anima', 'lumina', 'hunyuan'],
          description: 'Architecture discriminator — determines which fields are required',
          example: 'flux',
        },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Validation result', type: ValidationResultDto })
  validateTrain(@Body() dto: TrainTomlDto): ValidationResultDto {
    return validateTrainConfig(dto);
  }
}