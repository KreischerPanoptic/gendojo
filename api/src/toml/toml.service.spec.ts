import { Test, TestingModule } from '@nestjs/testing';
import { TomlService } from './toml.service';
import type {
  FluxTrainDto,
  ChromaTrainDto,
  SdxlTrainDto,
  Sd1TrainDto,
  Sd2TrainDto,
  Sd3TrainDto,
  AnimaTrainDto,
  LuminaTrainDto,
  HunyuanTrainDto,
} from './dto/train-toml.dto';
import type { DatasetTomlDto } from './dto/dataset-toml.dto';
import { validateTrainConfig } from '../utils/toml';

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

  // ─── getTrainScript ────────────────────────────────────────────────────────

  describe('getTrainScript', () => {
    it.each([
      ['sd1',     'train_network.py'],
      ['sd2',     'train_network.py'],
      ['sdxl',    'sdxl_train_network.py'],
      ['flux',    'flux_train_network.py'],
      ['chroma',  'flux_train_network.py'],
      ['sd3',     'sd3_train_network.py'],
      ['anima',   'anima_train_network.py'],
      ['lumina',  'lumina_train_network.py'],
      ['hunyuan', 'hunyuan_image_train_network.py'],
    ] as const)('returns %s → %s', (arch, expected) => {
      expect(service.getTrainScript(arch as Parameters<typeof service.getTrainScript>[0])).toBe(expected);
    });

    it('throws for unknown arch', () => {
      expect(() => service.getTrainScript('unknown' as never)).toThrow();
    });
  });

  // ─── getDefaultNetworkModule ───────────────────────────────────────────────

  describe('getDefaultNetworkModule', () => {
    it.each([
      ['sd1',     'networks.lora'],
      ['sd2',     'networks.lora'],
      ['sdxl',    'networks.lora'],
      ['flux',    'networks.lora_flux'],
      ['chroma',  'networks.lora_flux'],
      ['sd3',     'networks.lora'],
      ['anima',   'networks.lora_anima'],
      ['lumina',  'networks.lora_lumina'],
      ['hunyuan', 'networks.lora_hunyuan_image'],
    ] as const)('returns correct module for %s', (arch, expected) => {
      expect(service.getDefaultNetworkModule(arch as Parameters<typeof service.getDefaultNetworkModule>[0])).toBe(expected);
    });
  });

  // ─── generateDatasetToml ───────────────────────────────────────────────────

  describe('generateDatasetToml', () => {
    it('generates valid [general] section', () => {
      const dto: DatasetTomlDto = {
        general: { shuffle_caption: true, keep_tokens: 1, caption_extension: '.txt' },
        datasets: [
          {
            resolution: 512,
            batch_size: 4,
            subsets: [
              { image_dir: '/workspace/datasets/mycharacter', class_tokens: 'ohwx girl', num_repeats: 10 },
            ],
          },
        ],
      };
      const toml = service.generateDatasetToml(dto);
      expect(toml).toContain('[general]');
      expect(toml).toContain('shuffle_caption = true');
      expect(toml).toContain('keep_tokens = 1');
      expect(toml).toContain('[[datasets]]');
      expect(toml).toContain('resolution = 512');
      expect(toml).toContain('batch_size = 4');
      expect(toml).toContain('[[datasets.subsets]]');
      expect(toml).toContain('image_dir = "/workspace/datasets/mycharacter"');
      expect(toml).toContain('class_tokens = "ohwx girl"');
    });

    it('emits resolution as array for rectangular size', () => {
      const dto: DatasetTomlDto = {
        datasets: [
          {
            resolution: [1024, 768],
            subsets: [{ image_dir: '/data' }],
          },
        ],
      };
      const toml = service.generateDatasetToml(dto);
      expect(toml).toContain('resolution = [1024, 768]');
    });

    it('emits enable_bucket and bucket settings', () => {
      const dto: DatasetTomlDto = {
        datasets: [
          {
            enable_bucket: true,
            min_bucket_reso: 256,
            max_bucket_reso: 1024,
            bucket_reso_steps: 64,
            bucket_no_upscale: true,
            subsets: [{ image_dir: '/data', num_repeats: 5 }],
          },
        ],
      };
      const toml = service.generateDatasetToml(dto);
      expect(toml).toContain('enable_bucket = true');
      expect(toml).toContain('min_bucket_reso = 256');
      expect(toml).toContain('max_bucket_reso = 1024');
      expect(toml).toContain('bucket_reso_steps = 64');
      expect(toml).toContain('bucket_no_upscale = true');
    });

    it('emits fine-tuning subset with metadata_file (no class_tokens)', () => {
      const dto: DatasetTomlDto = {
        datasets: [
          {
            subsets: [
              {
                image_dir: '/workspace/datasets/ft',
                metadata_file: '/workspace/datasets/ft/meta.json',
              },
            ],
          },
        ],
      };
      const toml = service.generateDatasetToml(dto);
      expect(toml).toContain('metadata_file = "/workspace/datasets/ft/meta.json"');
      expect(toml).not.toContain('class_tokens');
    });

    it('emits is_reg for regularisation subsets', () => {
      const dto: DatasetTomlDto = {
        datasets: [
          {
            subsets: [
              { image_dir: '/data', is_reg: true, class_tokens: 'girl', num_repeats: 1 },
            ],
          },
        ],
      };
      const toml = service.generateDatasetToml(dto);
      expect(toml).toContain('is_reg = true');
    });

    it('skips undefined optional fields', () => {
      const dto: DatasetTomlDto = {
        datasets: [
          {
            subsets: [{ image_dir: '/data' }],
          },
        ],
      };
      const toml = service.generateDatasetToml(dto);
      expect(toml).not.toContain('shuffle_caption');
      expect(toml).not.toContain('flip_aug');
      expect(toml).not.toContain('bucket_reso_steps');
    });

    it('emits conditioning_data_dir for masked loss', () => {
      const dto: DatasetTomlDto = {
        datasets: [
          {
            subsets: [
              {
                image_dir: '/data',
                conditioning_data_dir: '/data/masks',
              },
            ],
          },
        ],
      };
      const toml = service.generateDatasetToml(dto);
      expect(toml).toContain('conditioning_data_dir = "/data/masks"');
    });

    it('escapes backslashes in Windows-style paths', () => {
      const dto: DatasetTomlDto = {
        datasets: [
          {
            subsets: [{ image_dir: 'C:\\hoge\\fuga' }],
          },
        ],
      };
      const toml = service.generateDatasetToml(dto);
      expect(toml).toContain('image_dir = "C:\\\\hoge\\\\fuga"');
    });
  });

  // ─── generateTrainToml ─────────────────────────────────────────────────────

  describe('generateTrainToml', () => {
    it('injects default network_module for flux', () => {
      const dto: FluxTrainDto = {
        arch: 'flux',
        pretrained_model_name_or_path: '/models/flux/flux1-dev.safetensors',
        clip_l: '/models/flux/clip_l.safetensors',
        t5xxl: '/models/flux/t5xxl.safetensors',
        ae: '/models/flux/ae.safetensors',
        dataset_config: '/workspace/dataset.toml',
        output_dir: '/workspace/outputs',
        output_name: 'my_flux_lora',
        network_dim: 16,
        learning_rate: 1e-4,
        optimizer_type: 'AdamW8bit',
        max_train_epochs: 10,
        guidance_scale: 1.0,
        timestep_sampling: 'flux_shift',
        model_prediction_type: 'raw',
        mixed_precision: 'bf16',
        gradient_checkpointing: true,
        cache_text_encoder_outputs: true,
        network_train_unet_only: true,
        cache_latents: true,
        save_model_as: 'safetensors',
      };
      const toml = service.generateTrainToml(dto);
      expect(toml).toContain('network_module = "networks.lora_flux"');
      // arch should NOT appear in output — it's not a valid sd-scripts argument
      expect(toml).not.toContain('arch =');
    });

    it('generates correct Chroma config', () => {
      const dto: ChromaTrainDto = {
        arch: 'chroma',
        model_type: 'chroma',
        pretrained_model_name_or_path: '/models/chroma/chroma.safetensors',
        t5xxl: '/models/chroma/t5xxl.safetensors',
        ae: '/models/chroma/ae.safetensors',
        dataset_config: '/workspace/dataset.toml',
        output_dir: '/workspace/outputs',
        output_name: 'my_chroma_lora',
        network_dim: 16,
        learning_rate: 1e-4,
        optimizer_type: 'AdamW8bit',
        max_train_epochs: 10,
        guidance_scale: 0.0,
        apply_t5_attn_mask: true,
        timestep_sampling: 'sigmoid',
        mixed_precision: 'bf16',
        gradient_checkpointing: true,
        network_train_unet_only: true,
        cache_text_encoder_outputs: true,
      };
      const toml = service.generateTrainToml(dto);
      expect(toml).toContain('model_type = "chroma"');
      expect(toml).toContain('guidance_scale = 0');
      expect(toml).toContain('apply_t5_attn_mask = true');
      expect(toml).not.toContain('clip_l');
    });

    it('generates SDXL config with dual TE learning rates', () => {
      const dto: SdxlTrainDto = {
        arch: 'sdxl',
        pretrained_model_name_or_path: '/models/sdxl/base.safetensors',
        dataset_config: '/workspace/dataset.toml',
        output_dir: '/workspace/outputs',
        output_name: 'my_sdxl_lora',
        network_dim: 32,
        network_alpha: 16,
        learning_rate: 1e-4,
        unet_lr: 1e-4,
        text_encoder_lr1: 1e-5,
        text_encoder_lr2: 1e-5,
        optimizer_type: 'AdamW8bit',
        max_train_epochs: 10,
        mixed_precision: 'bf16',
        gradient_checkpointing: true,
        cache_text_encoder_outputs: true,
        network_train_unet_only: true,
        cache_latents: true,
      };
      const toml = service.generateTrainToml(dto);
      expect(toml).toContain('text_encoder_lr1 = 0.00001');
      expect(toml).toContain('text_encoder_lr2 = 0.00001');
      expect(toml).toContain('network_module = "networks.lora"');
    });

    it('generates Anima config with qwen3 + vae paths', () => {
      const dto: AnimaTrainDto = {
        arch: 'anima',
        pretrained_model_name_or_path: '/models/anima/anima.safetensors',
        qwen3: '/models/anima/qwen3',
        vae: '/models/anima/qwen_image_vae.safetensors',
        dataset_config: '/workspace/dataset.toml',
        output_dir: '/workspace/outputs',
        output_name: 'my_anima_lora',
        network_dim: 8,
        learning_rate: 1e-4,
        optimizer_type: 'AdamW8bit',
        max_train_epochs: 10,
        mixed_precision: 'bf16',
        gradient_checkpointing: true,
        timestep_sampling: 'sigmoid',
        network_train_unet_only: true,
        cache_text_encoder_outputs: true,
        cache_latents: true,
        vae_chunk_size: 64,
        vae_disable_cache: true,
      };
      const toml = service.generateTrainToml(dto);
      expect(toml).toContain('network_module = "networks.lora_anima"');
      expect(toml).toContain('qwen3 = "/models/anima/qwen3"');
      expect(toml).toContain('vae = "/models/anima/qwen_image_vae.safetensors"');
      expect(toml).toContain('vae_chunk_size = 64');
      expect(toml).toContain('vae_disable_cache = true');
    });

    it('generates Lumina config with gemma2 + ae', () => {
      const dto: LuminaTrainDto = {
        arch: 'lumina',
        pretrained_model_name_or_path: '/models/lumina/lumina-image-2.safetensors',
        gemma2: '/models/lumina/gemma-2-2b.safetensors',
        ae: '/models/lumina/ae.safetensors',
        dataset_config: '/workspace/dataset.toml',
        output_dir: '/workspace/outputs',
        output_name: 'my_lumina_lora',
        network_dim: 8,
        network_alpha: 8,
        learning_rate: 1e-4,
        optimizer_type: 'AdamW',
        max_train_epochs: 10,
        mixed_precision: 'bf16',
        gradient_checkpointing: true,
        timestep_sampling: 'nextdit_shift',
        discrete_flow_shift: 6.0,
        model_prediction_type: 'raw',
        system_prompt: 'You are an assistant designed to generate high-quality images based on user prompts.',
      };
      const toml = service.generateTrainToml(dto);
      expect(toml).toContain('network_module = "networks.lora_lumina"');
      expect(toml).toContain('gemma2 = "/models/lumina/gemma-2-2b.safetensors"');
      expect(toml).toContain('ae = "/models/lumina/ae.safetensors"');
      expect(toml).toContain('timestep_sampling = "nextdit_shift"');
      expect(toml).toContain('discrete_flow_shift = 6');
      expect(toml).toContain('system_prompt =');
    });

    it('generates HunyuanImage config with text_encoder + byt5 + vae', () => {
      const dto: HunyuanTrainDto = {
        arch: 'hunyuan',
        pretrained_model_name_or_path: '/models/hunyuan/hunyuanimage2.1.safetensors',
        text_encoder: '/models/hunyuan/qwen_2.5_vl_7b.safetensors',
        byt5: '/models/hunyuan/byt5_small_glyphxl_fp16.safetensors',
        vae: '/models/hunyuan/hunyuan_image_2.1_vae_fp16.safetensors',
        dataset_config: '/workspace/dataset.toml',
        output_dir: '/workspace/outputs',
        output_name: 'my_hunyuan_lora',
        network_dim: 16,
        network_alpha: 1,
        network_train_unet_only: true,
        learning_rate: 1e-4,
        optimizer_type: 'AdamW8bit',
        max_train_epochs: 10,
        mixed_precision: 'bf16',
        gradient_checkpointing: true,
        model_prediction_type: 'raw',
        discrete_flow_shift: 5.0,
        blocks_to_swap: 18,
        cache_text_encoder_outputs: true,
        cache_latents: true,
      };
      const toml = service.generateTrainToml(dto);
      expect(toml).toContain('network_module = "networks.lora_hunyuan_image"');
      expect(toml).toContain('text_encoder =');
      expect(toml).toContain('byt5 =');
      expect(toml).toContain('network_train_unet_only = true');
      expect(toml).toContain('blocks_to_swap = 18');
    });

    it('respects explicitly provided network_module over default', () => {
      const dto: Sd1TrainDto = {
        arch: 'sd1',
        pretrained_model_name_or_path: '/models/v1-5-pruned.safetensors',
        dataset_config: '/workspace/dataset.toml',
        output_dir: '/workspace/outputs',
        output_name: 'my_lora',
        network_dim: 16,
        learning_rate: 1e-4,
        optimizer_type: 'AdamW8bit',
        max_train_epochs: 10,
        network_module: 'networks.lora_fa',  // custom override
      };
      const toml = service.generateTrainToml(dto);
      expect(toml).toContain('network_module = "networks.lora_fa"');
      expect(toml).not.toContain('networks.lora"');
    });

    it('emits network_args as inline array', () => {
      const dto: Sd1TrainDto = {
        arch: 'sd1',
        pretrained_model_name_or_path: '/models/v1-5-pruned.safetensors',
        dataset_config: '/workspace/dataset.toml',
        output_dir: '/workspace/outputs',
        output_name: 'my_lora',
        network_dim: 16,
        learning_rate: 1e-4,
        optimizer_type: 'AdamW8bit',
        max_train_epochs: 10,
        // LoRA-C3Lier: extend to Conv2d 3x3
        network_args: ['conv_dim=4', 'conv_alpha=1'],
      };
      const toml = service.generateTrainToml(dto);
      expect(toml).toContain('network_args = ["conv_dim=4", "conv_alpha=1"]');
    });

    it('generates SD2 config with v2 flag', () => {
      const dto: Sd2TrainDto = {
        arch: 'sd2',
        v2: true,
        v_parameterization: true,
        pretrained_model_name_or_path: '/models/768-v-ema.safetensors',
        dataset_config: '/workspace/dataset.toml',
        output_dir: '/workspace/outputs',
        output_name: 'my_sd2_lora',
        network_dim: 16,
        learning_rate: 1e-4,
        optimizer_type: 'AdamW8bit',
        max_train_epochs: 10,
        mixed_precision: 'fp16',
      };
      const toml = service.generateTrainToml(dto);
      expect(toml).toContain('v2 = true');
      expect(toml).toContain('v_parameterization = true');
    });

    it('generates SD3 config with separate TE files', () => {
      const dto: Sd3TrainDto = {
        arch: 'sd3',
        pretrained_model_name_or_path: '/models/sd3/sd3_medium.safetensors',
        clip_l: '/models/sd3/clip_l.safetensors',
        clip_g: '/models/sd3/clip_g.safetensors',
        t5xxl: '/models/sd3/t5xxl.safetensors',
        dataset_config: '/workspace/dataset.toml',
        output_dir: '/workspace/outputs',
        output_name: 'my_sd3_lora',
        network_dim: 16,
        network_alpha: 1,
        learning_rate: 1e-4,
        optimizer_type: 'AdamW8bit',
        max_train_epochs: 10,
        mixed_precision: 'fp16',
        gradient_checkpointing: true,
        weighting_scheme: 'uniform',
        blocks_to_swap: 32,
        network_train_unet_only: true,
        cache_text_encoder_outputs: true,
      };
      const toml = service.generateTrainToml(dto);
      expect(toml).toContain('clip_l =');
      expect(toml).toContain('clip_g =');
      expect(toml).toContain('t5xxl =');
      expect(toml).toContain('weighting_scheme = "uniform"');
      expect(toml).toContain('blocks_to_swap = 32');
    });
  });
});

// ─── validateTrainConfig ──────────────────────────────────────────────────────

describe('validateTrainConfig', () => {
  const baseFlux = (): FluxTrainDto => ({
    arch: 'flux',
    pretrained_model_name_or_path: '/models/flux.safetensors',
    clip_l: '/models/clip_l.safetensors',
    t5xxl: '/models/t5xxl.safetensors',
    ae: '/models/ae.safetensors',
    dataset_config: '/workspace/dataset.toml',
    output_dir: '/workspace/outputs',
    output_name: 'lora',
    network_dim: 16,
    learning_rate: 1e-4,
    optimizer_type: 'AdamW8bit',
    max_train_epochs: 10,
    guidance_scale: 1.0,
    network_train_unet_only: true,
  });

  it('passes for valid FLUX config', () => {
    const result = validateTrainConfig(baseFlux());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('fails when guidance_scale is missing for FLUX', () => {
    const dto = { ...baseFlux() } as FluxTrainDto & { guidance_scale?: number };
    delete dto.guidance_scale;
    const result = validateTrainConfig(dto as FluxTrainDto);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'guidance_scale')).toBe(true);
  });

  it('fails when FLUX clip_l is missing', () => {
    const dto = { ...baseFlux() } as FluxTrainDto & { clip_l?: string };
    delete dto.clip_l;
    const result = validateTrainConfig(dto as FluxTrainDto);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'clip_l')).toBe(true);
  });

  it('fails for Chroma without apply_t5_attn_mask', () => {
    const dto: ChromaTrainDto = {
      arch: 'chroma',
      model_type: 'chroma',
      pretrained_model_name_or_path: '/models/chroma.safetensors',
      t5xxl: '/models/t5xxl.safetensors',
      ae: '/models/ae.safetensors',
      dataset_config: '/workspace/dataset.toml',
      output_dir: '/workspace/outputs',
      output_name: 'lora',
      network_dim: 16,
      learning_rate: 1e-4,
      optimizer_type: 'AdamW8bit',
      max_train_epochs: 10,
      guidance_scale: 0.0,
      apply_t5_attn_mask: false as unknown as true, // deliberately wrong
      network_train_unet_only: true,
    };
    const result = validateTrainConfig(dto);
    expect(result.errors.some(e => e.field === 'apply_t5_attn_mask')).toBe(true);
  });

  it('fails for HunyuanImage without network_train_unet_only', () => {
    const dto: Omit<HunyuanTrainDto, 'network_train_unet_only'> & { network_train_unet_only?: boolean } = {
      arch: 'hunyuan',
      pretrained_model_name_or_path: '/models/hunyuan.safetensors',
      text_encoder: '/models/qwen2.5vl.safetensors',
      byt5: '/models/byt5.safetensors',
      vae: '/models/vae.safetensors',
      dataset_config: '/workspace/dataset.toml',
      output_dir: '/workspace/outputs',
      output_name: 'lora',
      network_dim: 16,
      learning_rate: 1e-4,
      optimizer_type: 'AdamW8bit',
      max_train_epochs: 10,
      // network_train_unet_only omitted intentionally
    };
    const result = validateTrainConfig(dto as HunyuanTrainDto);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'network_train_unet_only')).toBe(true);
  });

  it('fails for SDXL cache_text_encoder_outputs without network_train_unet_only', () => {
    const dto: SdxlTrainDto = {
      arch: 'sdxl',
      pretrained_model_name_or_path: '/models/sdxl.safetensors',
      dataset_config: '/workspace/dataset.toml',
      output_dir: '/workspace/outputs',
      output_name: 'lora',
      network_dim: 32,
      learning_rate: 1e-4,
      optimizer_type: 'AdamW8bit',
      max_train_epochs: 10,
      cache_text_encoder_outputs: true,
      // network_train_unet_only missing intentionally
    };
    const result = validateTrainConfig(dto);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field === 'cache_text_encoder_outputs')).toBe(true);
  });

  it('fails for Anima without xformers+split_attn', () => {
    const dto: AnimaTrainDto = {
      arch: 'anima',
      pretrained_model_name_or_path: '/models/anima.safetensors',
      qwen3: '/models/qwen3',
      vae: '/models/vae.safetensors',
      dataset_config: '/workspace/dataset.toml',
      output_dir: '/workspace/outputs',
      output_name: 'lora',
      network_dim: 8,
      learning_rate: 1e-4,
      optimizer_type: 'AdamW8bit',
      max_train_epochs: 10,
      attn_mode: 'xformers',
      // split_attn missing intentionally
    };
    const result = validateTrainConfig(dto);
    expect(result.errors.some(e => e.field === 'split_attn')).toBe(true);
  });

  it('fails when neither max_train_steps nor max_train_epochs is set', () => {
    const dto = { ...baseFlux() } as FluxTrainDto & { max_train_epochs?: number };
    delete dto.max_train_epochs;
    const result = validateTrainConfig(dto as FluxTrainDto);
    expect(result.errors.some(e => e.field.includes('max_train'))).toBe(true);
  });

  it('fails for SD3 with partial text encoder files', () => {
    const dto: Sd3TrainDto = {
      arch: 'sd3',
      pretrained_model_name_or_path: '/models/sd3.safetensors',
      clip_l: '/models/clip_l.safetensors', // only clip_l provided, clip_g and t5xxl missing
      dataset_config: '/workspace/dataset.toml',
      output_dir: '/workspace/outputs',
      output_name: 'lora',
      network_dim: 16,
      learning_rate: 1e-4,
      optimizer_type: 'AdamW8bit',
      max_train_epochs: 10,
    };
    const result = validateTrainConfig(dto);
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.field.includes('clip_l'))).toBe(true);
  });
});