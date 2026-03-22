import { Injectable, Logger } from "@nestjs/common";
import type {
  DatasetTomlDto,
  SubsetDto,
  DatasetDto,
  GeneralDto,
} from "./dto/dataset-toml.dto";
import type { TrainTomlDto } from "./dto/train-toml.dto";
import { ARCH_META } from "./types/train-toml.types";
import type { ModelArchitecture } from "../models/types/models.types";
import { serializeFlat } from "../utils/toml";

@Injectable()
export class TomlService {
  private readonly logger = new Logger(TomlService.name);

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Generate dataset.toml content for --dataset_config.
   *
   * Output structure:
   *   [general]              ← optional
   *   [[datasets]]           ← one or more
   *     [[datasets.subsets]] ← one or more per dataset
   */
  generateDatasetToml(dto: DatasetTomlDto): string {
    const sections: string[] = [];

    if (dto.general) {
      const generalFields = this.extractGeneralFields(dto.general);
      if (Object.keys(generalFields).length > 0) {
        sections.push("[general]");
        sections.push(serializeFlat(generalFields));
        sections.push("");
      }
    }

    for (const dataset of dto.datasets) {
      const datasetFields = this.extractDatasetFields(dataset);
      sections.push("[[datasets]]");
      if (Object.keys(datasetFields).length > 0) {
        sections.push(serializeFlat(datasetFields));
      }
      sections.push("");

      for (const subset of dataset.subsets) {
        sections.push("  [[datasets.subsets]]");
        const subsetFields = this.extractSubsetFields(subset);
        sections.push(
          "  " + serializeFlat(subsetFields).replace(/\n/g, "\n  "),
        );
        sections.push("");
      }
    }

    return sections.join("\n").trimEnd() + "\n";
  }

  /**
   * Generate train.toml content for --config_file.
   *
   * All training CLI arguments are serialised as a flat TOML document.
   * `arch` is stripped — it is only used for service-side routing and is
   * not a valid sd-scripts argument.
   * `network_module` defaults to the architecture default if not provided.
   */
  generateTrainToml(dto: TrainTomlDto): string {
    const { arch, ...rest } = dto as TrainTomlDto & { arch: string };
    const meta = ARCH_META[arch as ModelArchitecture];

    const resolved: Record<string, unknown> = { ...rest };
    if (!resolved["network_module"] && meta) {
      resolved["network_module"] = meta.defaultNetworkModule;
    }

    const cleaned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(resolved)) {
      if (v !== undefined && v !== null) cleaned[k] = v;
    }

    this.logger.debug(
      `Generating train TOML for arch=${arch}, keys=${Object.keys(cleaned).length}`,
    );
    return serializeFlat(cleaned) + "\n";
  }

  /**
   * Return the training script filename for a given architecture.
   * Throws if arch is unrecognised.
   */
  getTrainScript(arch: ModelArchitecture): string {
    const meta = ARCH_META[arch];
    if (!meta) {
      throw new Error(
        `No training script registered for architecture: "${arch}"`,
      );
    }
    return meta.script;
  }

  /** Return the default network module string for a given architecture. */
  getDefaultNetworkModule(arch: ModelArchitecture): string {
    const meta = ARCH_META[arch];
    if (!meta) {
      throw new Error(
        `No network module registered for architecture: "${arch}"`,
      );
    }
    return meta.defaultNetworkModule;
  }

  // ── Private: field extraction ───────────────────────────────────────────────

  /**
   * Extract [general]-level fields.
   *
   * Includes all subset-level options that are valid at [general] per
   * config_README-en.md, including DreamBooth-shared options
   * (caption_extension, cache_info, conditioning_data_dir, alpha_mask).
   */
  private extractGeneralFields(g: GeneralDto): Record<string, unknown> {
    const {
      // Dataset-scope
      resolution,
      batch_size,
      enable_bucket,
      min_bucket_reso,
      max_bucket_reso,
      bucket_reso_steps,
      bucket_no_upscale,
      interpolation_type,
      validation_seed,
      // Subset-scope — common
      shuffle_caption,
      keep_tokens,
      keep_tokens_separator,
      secondary_separator,
      enable_wildcard,
      flip_aug,
      color_aug,
      random_crop,
      face_crop_aug_range,
      caption_prefix,
      caption_suffix,
      caption_separator,
      resize_interpolation,
      num_repeats,
      // Subset-scope — DreamBooth-shared (valid at [general] per docs)
      caption_extension,
      cache_info,
      conditioning_data_dir,
      alpha_mask,
      // Caption dropout
      caption_dropout_every_n_epochs,
      caption_dropout_rate,
      caption_tag_dropout_rate,
      // Validation split
      validation_split,
    } = g;

    return this.compact({
      resolution: this.serializeResolution(resolution),
      batch_size,
      enable_bucket,
      min_bucket_reso,
      max_bucket_reso,
      bucket_reso_steps,
      bucket_no_upscale,
      interpolation_type,
      validation_seed,
      shuffle_caption,
      keep_tokens,
      keep_tokens_separator,
      secondary_separator,
      enable_wildcard,
      flip_aug,
      color_aug,
      random_crop,
      face_crop_aug_range,
      caption_prefix,
      caption_suffix,
      caption_separator,
      resize_interpolation,
      num_repeats,
      caption_extension,
      cache_info,
      conditioning_data_dir,
      alpha_mask,
      caption_dropout_every_n_epochs,
      caption_dropout_rate,
      caption_tag_dropout_rate,
      validation_split,
    });
  }

  /**
   * Extract [[datasets]]-level fields (excluding subsets).
   *
   * Same set as [general] — both levels accept the same options per docs.
   */
  private extractDatasetFields(d: DatasetDto): Record<string, unknown> {
    const { subsets: _subsets, ...rest } = d;
    const {
      resolution,
      batch_size,
      enable_bucket,
      min_bucket_reso,
      max_bucket_reso,
      bucket_reso_steps,
      bucket_no_upscale,
      interpolation_type,
      validation_seed,
      shuffle_caption,
      keep_tokens,
      keep_tokens_separator,
      secondary_separator,
      enable_wildcard,
      flip_aug,
      color_aug,
      random_crop,
      face_crop_aug_range,
      caption_prefix,
      caption_suffix,
      caption_separator,
      resize_interpolation,
      num_repeats,
      caption_extension,
      cache_info,
      conditioning_data_dir,
      alpha_mask,
      caption_dropout_every_n_epochs,
      caption_dropout_rate,
      caption_tag_dropout_rate,
      validation_split,
    } = rest;

    return this.compact({
      resolution: this.serializeResolution(resolution),
      batch_size,
      enable_bucket,
      min_bucket_reso,
      max_bucket_reso,
      bucket_reso_steps,
      bucket_no_upscale,
      interpolation_type,
      validation_seed,
      shuffle_caption,
      keep_tokens,
      keep_tokens_separator,
      secondary_separator,
      enable_wildcard,
      flip_aug,
      color_aug,
      random_crop,
      face_crop_aug_range,
      caption_prefix,
      caption_suffix,
      caption_separator,
      resize_interpolation,
      num_repeats,
      caption_extension,
      cache_info,
      conditioning_data_dir,
      alpha_mask,
      caption_dropout_every_n_epochs,
      caption_dropout_rate,
      caption_tag_dropout_rate,
      validation_split,
    });
  }

  /**
   * Extract [[datasets.subsets]]-level fields.
   *
   * DreamBooth vs fine-tuning is determined by presence of `metadata_file`
   * (matches sd-scripts runtime logic exactly).
   */
  private extractSubsetFields(s: SubsetDto): Record<string, unknown> {
    const shared = this.compact({
      num_repeats: s.num_repeats,
      shuffle_caption: s.shuffle_caption,
      keep_tokens: s.keep_tokens,
      keep_tokens_separator: s.keep_tokens_separator,
      secondary_separator: s.secondary_separator,
      enable_wildcard: s.enable_wildcard,
      flip_aug: s.flip_aug,
      color_aug: s.color_aug,
      random_crop: s.random_crop,
      face_crop_aug_range: s.face_crop_aug_range,
      caption_prefix: s.caption_prefix,
      caption_suffix: s.caption_suffix,
      caption_separator: s.caption_separator,
      resize_interpolation: s.resize_interpolation,
      caption_dropout_every_n_epochs: s.caption_dropout_every_n_epochs,
      caption_dropout_rate: s.caption_dropout_rate,
      caption_tag_dropout_rate: s.caption_tag_dropout_rate,
      validation_split: s.validation_split,
      // DreamBooth-shared — valid at subset level for both methods
      caption_extension: s.caption_extension,
      cache_info: s.cache_info,
      conditioning_data_dir: s.conditioning_data_dir,
      alpha_mask: s.alpha_mask,
    });

    if ("metadata_file" in s && s.metadata_file !== undefined) {
      // Fine-tuning method — metadata_file presence is the discriminator
      return this.compact({
        ...shared,
        image_dir: s.image_dir,
        metadata_file: s.metadata_file,
      });
    }

    // DreamBooth method
    const db = s as import("./dto/dataset-toml.dto").DreamBoothSubsetDto;
    return this.compact({
      ...shared,
      image_dir: db.image_dir,
      class_tokens: db.class_tokens,
      is_reg: db.is_reg,
    });
  }

  // ── Private: helpers ────────────────────────────────────────────────────────

  /**
   * resolution serialization:
   *   512        → 512           (single number)
   *   [1024,768] → [1024, 768]   (inline TOML array)
   * tomlValue() in serializeFlat handles both via Array.isArray check.
   */
  private serializeResolution(
    resolution: number | [number, number] | undefined,
  ): number | [number, number] | undefined {
    return resolution;
  }

  /** Remove undefined/null entries from an object before TOML serialisation */
  private compact(obj: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      if (v !== undefined && v !== null) result[k] = v;
    }
    return result;
  }
}
