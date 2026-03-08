/**
 * Arch-aware validator for TrainTomlDto.
 *
 * Validates that all required model paths are present for the selected
 * architecture, catches common incompatible option combinations (documented
 * as constraints in the sd-scripts docs), and returns a structured result so
 * the controller can return 400 with clear field-level messages instead of
 * a cryptic Python traceback.
 *
 * Rules source: every *_train_network.md doc in the sd-scripts submodule.
 */

import type {
  TrainTomlDto,
  FluxTrainDto,
  ChromaTrainDto,
  Sd3TrainDto,
  AnimaTrainDto,
  LuminaTrainDto,
  HunyuanTrainDto,
  SdxlTrainDto,
} from '../../toml/dto/train-toml.dto';

// ─────────────────────────────────────────────────────────────────────────────
// Result type
// ─────────────────────────────────────────────────────────────────────────────

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

function err(field: string, message: string): ValidationError {
  return { field, message };
}

function requirePath(
  errors: ValidationError[],
  value: string | undefined,
  field: string,
  archLabel: string,
): void {
  if (!value || value.trim() === '') {
    errors.push(
      err(field, `${field} is required for ${archLabel} training`),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Per-architecture validators
// ─────────────────────────────────────────────────────────────────────────────

function validateSd1(dto: TrainTomlDto & { arch: 'sd1' }, errors: ValidationError[]): void {
  requirePath(errors, dto.pretrained_model_name_or_path, 'pretrained_model_name_or_path', 'SD1');

  if ((dto as { v2?: unknown }).v2) {
    errors.push(err('v2', 'v2 must not be set for arch=sd1; use arch=sd2 instead'));
  }
}

function validateSd2(dto: TrainTomlDto & { arch: 'sd2' }, errors: ValidationError[]): void {
  requirePath(errors, dto.pretrained_model_name_or_path, 'pretrained_model_name_or_path', 'SD2');

  if (!dto.v2) {
    errors.push(err('v2', 'v2 must be true for arch=sd2'));
  }
}

function validateSdxl(dto: SdxlTrainDto, errors: ValidationError[]): void {
  requirePath(errors, dto.pretrained_model_name_or_path, 'pretrained_model_name_or_path', 'SDXL');

  // cache_text_encoder_outputs requires network_train_unet_only
  if (dto.cache_text_encoder_outputs && !dto.network_train_unet_only) {
    errors.push(
      err(
        'cache_text_encoder_outputs',
        'cache_text_encoder_outputs requires network_train_unet_only=true ' +
        '(LoRA text encoder modules cannot be trained while outputs are cached — sdxl_train_network.md §3.1)',
      ),
    );
  }

  // fused_backward_pass only works with Adafactor, not with gradient accumulation
  if (dto.fused_backward_pass) {
    if (
      dto.optimizer_type &&
      !dto.optimizer_type.toLowerCase().includes('adafactor')
    ) {
      errors.push(
        err(
          'fused_backward_pass',
          'fused_backward_pass currently only supports Adafactor optimizer (train_network_advanced.md §1.5)',
        ),
      );
    }
    if (dto.gradient_accumulation_steps && dto.gradient_accumulation_steps > 1) {
      errors.push(
        err(
          'fused_backward_pass',
          'fused_backward_pass cannot be used with gradient_accumulation_steps > 1',
        ),
      );
    }
  }

  // no_half_vae recommended with fp16, warn-level (not error) — we raise it anyway
  // as a notice field so the UI can surface it
}

function validateFlux(dto: FluxTrainDto, errors: ValidationError[]): void {
  requirePath(errors, dto.pretrained_model_name_or_path, 'pretrained_model_name_or_path', 'FLUX');
  requirePath(errors, dto.clip_l,  'clip_l',  'FLUX');
  requirePath(errors, dto.t5xxl,   't5xxl',   'FLUX');
  requirePath(errors, dto.ae,      'ae',      'FLUX');

  // cache_text_encoder_outputs requires network_train_unet_only
  if (dto.cache_text_encoder_outputs && !dto.network_train_unet_only) {
    errors.push(
      err(
        'cache_text_encoder_outputs',
        'cache_text_encoder_outputs requires network_train_unet_only=true for FLUX ' +
        '(flux_train_network.md §4.1)',
      ),
    );
  }

  // blocks_to_swap + cpu_offload_checkpointing are mutually exclusive
  if (dto.blocks_to_swap && (dto as unknown as Record<string, unknown>)['cpu_offload_checkpointing']) {
    errors.push(
      err(
        'blocks_to_swap',
        'blocks_to_swap cannot be used together with cpu_offload_checkpointing (flux_train_network.md §4.1)',
      ),
    );
  }

  // guidance_scale: 3.5 default is wrong for training — must be explicitly 1.0
  if (dto.guidance_scale === undefined) {
    errors.push(
      err(
        'guidance_scale',
        'guidance_scale must be set explicitly for FLUX training. ' +
        'Use 1.0 (disables embedded guidance). ' +
        'Default 3.5 is for inference only (flux_train_network.md §4.1)',
      ),
    );
  }
}

function validateChroma(dto: ChromaTrainDto, errors: ValidationError[]): void {
  requirePath(errors, dto.pretrained_model_name_or_path, 'pretrained_model_name_or_path', 'Chroma');
  requirePath(errors, dto.t5xxl, 't5xxl', 'Chroma');
  requirePath(errors, dto.ae,    'ae',    'Chroma');

  // Chroma must NOT have clip_l
  if ((dto as unknown as Record<string, unknown>)['clip_l']) {
    errors.push(
      err('clip_l', 'Chroma does not use CLIP-L — remove clip_l (flux_train_network.md §4 Chroma)'),
    );
  }

  // guidance_scale must be 0.0
  if (dto.guidance_scale !== 0.0) {
    errors.push(
      err(
        'guidance_scale',
        'Chroma requires guidance_scale=0.0 to disable embedded guidance (flux_train_network.md §4)',
      ),
    );
  }

  // apply_t5_attn_mask must be true for Chroma
  if (!dto.apply_t5_attn_mask) {
    errors.push(
      err(
        'apply_t5_attn_mask',
        'apply_t5_attn_mask must be true for Chroma models (flux_train_network.md §4)',
      ),
    );
  }

  // model_type must be "chroma"
  if (dto.model_type !== 'chroma') {
    errors.push(
      err('model_type', 'model_type must be "chroma" for Chroma training'),
    );
  }

  // cache_text_encoder_outputs requires network_train_unet_only
  if (dto.cache_text_encoder_outputs && !dto.network_train_unet_only) {
    errors.push(
      err(
        'cache_text_encoder_outputs',
        'cache_text_encoder_outputs requires network_train_unet_only=true for Chroma',
      ),
    );
  }
}

function validateSd3(dto: Sd3TrainDto, errors: ValidationError[]): void {
  requirePath(errors, dto.pretrained_model_name_or_path, 'pretrained_model_name_or_path', 'SD3');

  // SD3: text encoder paths are optional ONLY when using a single merged .safetensors.
  // If any one of the three is provided, all three should be provided — otherwise
  // sd-scripts will fail trying to load the missing one from the single file
  // while others are explicitly overridden.  We do a best-effort check here.
  const teCount = [dto.clip_l, dto.clip_g, dto.t5xxl].filter(Boolean).length;
  if (teCount > 0 && teCount < 3) {
    errors.push(
      err(
        'clip_l / clip_g / t5xxl',
        'When providing separate text encoder files for SD3, all three ' +
        '(clip_l, clip_g, t5xxl) should be specified. ' +
        'Omit all three to load from the merged model file instead ' +
        '(sd3_train_network.md §4.1)',
      ),
    );
  }

  // cache_text_encoder_outputs is highly recommended for SD3 (3 encoders);
  // if set, network_train_unet_only is required
  if (dto.cache_text_encoder_outputs && !dto.network_train_unet_only) {
    errors.push(
      err(
        'cache_text_encoder_outputs',
        'cache_text_encoder_outputs requires network_train_unet_only=true for SD3 ' +
        '(sd3_train_network.md §4.1)',
      ),
    );
  }
}

function validateAnima(dto: AnimaTrainDto, errors: ValidationError[]): void {
  requirePath(errors, dto.pretrained_model_name_or_path, 'pretrained_model_name_or_path', 'Anima');
  requirePath(errors, dto.qwen3, 'qwen3', 'Anima');
  requirePath(errors, dto.vae,   'vae',   'Anima');

  // xformers requires split_attn
  if (dto.attn_mode === 'xformers' && !dto.split_attn) {
    errors.push(
      err(
        'split_attn',
        'split_attn must be true when attn_mode="xformers" for Anima ' +
        '(anima_train_network.md §4.1)',
      ),
    );
  }

  // sageattn is inference-only for Anima
  if (dto.attn_mode === 'sageattn') {
    errors.push(
      err(
        'attn_mode',
        'attn_mode="sageattn" does not support training for Anima — inference only ' +
        '(anima_train_network.md §4.1)',
      ),
    );
  }

  // blocks_to_swap + unsloth_offload_checkpointing are mutually exclusive
  if (dto.blocks_to_swap && dto.unsloth_offload_checkpointing) {
    errors.push(
      err(
        'blocks_to_swap',
        'blocks_to_swap and unsloth_offload_checkpointing are mutually exclusive ' +
        '(anima_train_network.md §4.1)',
      ),
    );
  }

  // cache_text_encoder_outputs requires network_train_unet_only
  if (dto.cache_text_encoder_outputs && !dto.network_train_unet_only) {
    errors.push(
      err(
        'cache_text_encoder_outputs',
        'cache_text_encoder_outputs requires network_train_unet_only=true for Anima',
      ),
    );
  }
}

function validateLumina(dto: LuminaTrainDto, errors: ValidationError[]): void {
  requirePath(errors, dto.pretrained_model_name_or_path, 'pretrained_model_name_or_path', 'Lumina');
  requirePath(errors, dto.gemma2, 'gemma2', 'Lumina');
  requirePath(errors, dto.ae,     'ae',     'Lumina');
}

function validateHunyuan(dto: HunyuanTrainDto, errors: ValidationError[]): void {
  requirePath(errors, dto.pretrained_model_name_or_path, 'pretrained_model_name_or_path', 'HunyuanImage');
  requirePath(errors, dto.text_encoder, 'text_encoder', 'HunyuanImage (Qwen2.5-VL)');
  requirePath(errors, dto.byt5,         'byt5',         'HunyuanImage');
  requirePath(errors, dto.vae,          'vae',          'HunyuanImage');

  // network_train_unet_only is ALWAYS required for HunyuanImage
  if (!dto.network_train_unet_only) {
    errors.push(
      err(
        'network_train_unet_only',
        'network_train_unet_only must be true for HunyuanImage — LoRA for text encoders is not supported ' +
        '(hunyuan_image_train_network.md §4.1)',
      ),
    );
  }

  // blocks_to_swap + cpu_offload_checkpointing are mutually exclusive
  if (dto.blocks_to_swap && dto.cpu_offload_checkpointing) {
    errors.push(
      err(
        'blocks_to_swap',
        'blocks_to_swap cannot be used with cpu_offload_checkpointing for HunyuanImage ' +
        '(hunyuan_image_train_network.md §6.1)',
      ),
    );
  }

  // attn_mode=xformers + batch_size > 1 → split_attn required
  if (dto.attn_mode === 'xformers' && !dto.split_attn) {
    errors.push(
      err(
        'split_attn',
        'split_attn must be true when attn_mode="xformers" with batch_size > 1 for HunyuanImage ' +
        '(hunyuan_image_train_network.md §4.1)',
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Common cross-arch validations
// ─────────────────────────────────────────────────────────────────────────────

function validateCommon(dto: TrainTomlDto, errors: ValidationError[]): void {
  // output_dir + output_name required for all architectures
  if (!dto.output_dir?.trim()) {
    errors.push(err('output_dir', 'output_dir is required'));
  }
  if (!dto.output_name?.trim()) {
    errors.push(err('output_name', 'output_name is required'));
  }
  if (!dto.dataset_config?.trim()) {
    errors.push(err('dataset_config', 'dataset_config is required'));
  }

  // network_dim is required for LoRA training
  if (!dto.network_dim || dto.network_dim <= 0) {
    errors.push(err('network_dim', 'network_dim must be a positive integer (LoRA rank)'));
  }

  // learning_rate must be positive
  if (!dto.learning_rate || dto.learning_rate <= 0) {
    errors.push(err('learning_rate', 'learning_rate must be a positive number'));
  }

  // optimizer_type required
  if (!dto.optimizer_type?.trim()) {
    errors.push(err('optimizer_type', 'optimizer_type is required (e.g. AdamW8bit, AdamW, Adafactor)'));
  }

  // One of max_train_steps or max_train_epochs must be set
  if (!dto.max_train_steps && !dto.max_train_epochs) {
    errors.push(
      err(
        'max_train_steps / max_train_epochs',
        'Either max_train_steps or max_train_epochs must be specified',
      ),
    );
  }

  // Validation loss: schedule-free optimizers are incompatible
  if (dto.validate_every_n_steps || dto.validate_every_n_epochs) {
    const sf = dto.optimizer_type?.toLowerCase() ?? '';
    if (sf.includes('schedulefree') || sf.includes('schedule_free')) {
      errors.push(
        err(
          'validate_every_n_steps / validate_every_n_epochs',
          'Validation loss is not supported with Schedule-Free optimizers (validation.md)',
        ),
      );
    }
  }

  // flip_aug / color_aug / random_crop are disabled when cache_latents is set
  // (informational — sd-scripts silently disables them, but the user should know)
  const hasAugmentation =
    (dto as unknown as Record<string, unknown>)['flip_aug'] ||
    (dto as unknown as Record<string, unknown>)['color_aug'] ||
    (dto as unknown as Record<string, unknown>)['random_crop'];

  if (dto.cache_latents && hasAugmentation) {
    errors.push(
      err(
        'cache_latents',
        'cache_latents disables image augmentations (flip_aug, color_aug, random_crop). ' +
        'Set them in dataset config only, or disable cache_latents.',
      ),
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────

export function validateTrainConfig(dto: TrainTomlDto): ValidationResult {
  const errors: ValidationError[] = [];

  validateCommon(dto, errors);

  switch (dto.arch) {
    case 'sd1':
      validateSd1(dto as TrainTomlDto & { arch: 'sd1' }, errors);
      break;
    case 'sd2':
      validateSd2(dto as TrainTomlDto & { arch: 'sd2' }, errors);
      break;
    case 'sdxl':
      validateSdxl(dto as SdxlTrainDto, errors);
      break;
    case 'flux':
      validateFlux(dto as FluxTrainDto, errors);
      break;
    case 'chroma':
      validateChroma(dto as ChromaTrainDto, errors);
      break;
    case 'sd3':
      validateSd3(dto as Sd3TrainDto, errors);
      break;
    case 'anima':
      validateAnima(dto as AnimaTrainDto, errors);
      break;
    case 'lumina':
      validateLumina(dto as LuminaTrainDto, errors);
      break;
    case 'hunyuan':
      validateHunyuan(dto as HunyuanTrainDto, errors);
      break;
    default:
      errors.push(
        err(
          'arch',
          `Unknown architecture: "${(dto as { arch: string }).arch}". ` +
          'Must be one of: sd1, sd2, sdxl, flux, chroma, sd3, anima, lumina, hunyuan',
        ),
      );
  }

  return { valid: errors.length === 0, errors };
}