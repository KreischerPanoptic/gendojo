// ─────────────────────────────────────────────────────────────────────────────
// Shared / common option types
// ─────────────────────────────────────────────────────────────────────────────

import { ModelArchitecture } from "../../models/types/models.types";

export type SaveFormat =
  | "safetensors"
  | "ckpt"
  | "pt"
  | "diffusers"
  | "diffusers_safetensors";
export type MixedPrecision = "no" | "fp16" | "bf16";
export type SavePrecision = "float" | "fp16" | "bf16";
export type LrScheduler =
  | "constant"
  | "cosine"
  | "cosine_with_restarts"
  | "polynomial"
  | "linear"
  | "constant_with_warmup"
  | "inverse_sqrt"
  | "adafactor";
export type LossType = "l1" | "l2" | "huber" | "smooth_l1";
export type HuberSchedule = "constant" | "exponential" | "snr";
export type AttentionMode = "torch" | "xformers" | "flash" | "sageattn";
export type LogWith = "tensorboard" | "wandb" | "all";

// ─────────────────────────────────────────────────────────────────────────────
// FLUX.1 — flux_train_network.py
// ─────────────────────────────────────────────────────────────────────────────

export type FluxTimestepSampling =
  | "sigma"
  | "uniform"
  | "sigmoid"
  | "shift"
  | "flux_shift";

export type FluxModelPredictionType = "raw" | "additive" | "sigma_scaled";

// ─────────────────────────────────────────────────────────────────────────────
// SD3 / SD3.5 — sd3_train_network.py
// ─────────────────────────────────────────────────────────────────────────────

export type Sd3WeightingScheme =
  | "sigma_sqrt"
  | "logit_normal"
  | "mode"
  | "cosmap"
  | "uniform"
  | "none";

// ─────────────────────────────────────────────────────────────────────────────
// Lumina Image 2.0 — lumina_train_network.py
// ─────────────────────────────────────────────────────────────────────────────

export type LuminaTimestepSampling =
  | "sigma"
  | "uniform"
  | "sigmoid"
  | "shift"
  | "nextdit_shift";

// ─────────────────────────────────────────────────────────────────────────────
// Metadata derived from arch — consumed by TomlService and JobsService
// ─────────────────────────────────────────────────────────────────────────────

export interface ArchMeta {
  /** Python script to launch with accelerate */
  script: string;
  /** Default network module for this architecture */
  defaultNetworkModule: string;
}

export const ARCH_META: Readonly<Record<ModelArchitecture, ArchMeta | null>> = {
  sd1: { script: "train_network.py", defaultNetworkModule: "networks.lora" },
  sd2: { script: "train_network.py", defaultNetworkModule: "networks.lora" },
  sdxl: {
    script: "sdxl_train_network.py",
    defaultNetworkModule: "networks.lora",
  },
  flux: {
    script: "flux_train_network.py",
    defaultNetworkModule: "networks.lora_flux",
  },
  chroma: {
    script: "flux_train_network.py",
    defaultNetworkModule: "networks.lora_flux",
  },
  sd3: {
    script: "sd3_train_network.py",
    defaultNetworkModule: "networks.lora",
  },
  anima: {
    script: "anima_train_network.py",
    defaultNetworkModule: "networks.lora_anima",
  },
  lumina: {
    script: "lumina_train_network.py",
    defaultNetworkModule: "networks.lora_lumina",
  },
  hunyuan: {
    script: "hunyuan_image_train_network.py",
    defaultNetworkModule: "networks.lora_hunyuan_image",
  },
  unknown: null,
};
