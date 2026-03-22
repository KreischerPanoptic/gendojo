import { ModelArchitecture } from '#contracts/enums'
import type { ModelIntegrityStatus } from '#contracts/enums'

export const ModelFamily = {
  StableDiffusion: [
    ModelArchitecture.SD1,
    ModelArchitecture.SD2,
    ModelArchitecture.SDXL,
    ModelArchitecture.SD3,
  ],
  FluxEcosystem: [ModelArchitecture.FLUX_1, ModelArchitecture.Chroma],
} as const

export const MODEL_CATEGORIES = ['base', 'adapter', 'component', 'unknown'] as const
export type ModelCategory = (typeof MODEL_CATEGORIES)[number]

export type BaseModelRole = 'checkpoint' | 'dit' | 'unet'

export type AdapterModelRole = 'lora' | 'llm_adapter'

export type ComponentModelRole =
  | 'vae'
  | 'ae'
  | 'clip_l'
  | 'clip_g'
  | 'clip_h'
  | 't5xxl'
  | 'gemma2'
  | 'qwen3'
  | 'qwen2_5_vl'
  | 'byt5'
  | 'text_encoder'

export type ModelRole = BaseModelRole | AdapterModelRole | ComponentModelRole | 'unknown'

export const RoleToCategoryMap: Record<ModelRole, ModelCategory> = {
  checkpoint: 'base',
  dit: 'base',
  unet: 'base',
  lora: 'adapter',
  llm_adapter: 'adapter',
  vae: 'component',
  ae: 'component',
  clip_l: 'component',
  clip_g: 'component',
  clip_h: 'component',
  t5xxl: 'component',
  gemma2: 'component',
  qwen3: 'component',
  qwen2_5_vl: 'component',
  byt5: 'component',
  text_encoder: 'component',
  unknown: 'unknown',
} as const
export const MODEL_ROLES = Object.keys(RoleToCategoryMap) as ModelRole[]
export const MODEL_EXTENSIONS = new Set(['.safetensors', '.ckpt', '.pt', '.bin'])

export interface FileIntegrityResult {
  id: string
  filename: string
  status: ModelIntegrityStatus
  computedSha256: string
  expectedSha256: string | null
  sizeGb: number
  sizeMb: number
  sizeBytes: number
  checkedAt: Date
}

// ─────────────────────────────────────────────────────────────────────────────
// Architecture Readiness Check
// ─────────────────────────────────────────────────────────────────────────────

// export interface RolePresence {
//   role: ModelRole
//   required: boolean
//   present: boolean
//   /** Actual database files fulfilling this role */
//   files: ModelFile[]
//   // REMOVED expectedDir. The physical path is irrelevant to readiness.
// }

// export interface ArchReadinessResult {
//   arch: ModelArchitecture
//   /** True if AT LEAST ONE variant from the ARCH_BLUEPRINTS is fully satisfied */
//   ready: boolean
//   /** * The specific blueprint variant that achieved readiness.
//    * Null if the engine is broken/incomplete.
//    */
//   satisfiedVariant: ModelRole[] | null
//   /** * The missing roles preventing the closest-to-complete variant from firing up.
//    */
//   missingRoles: ModelRole[]
//   /** Full diagnostic breakdown for every role in the evaluated variant */
//   rolePresence: RolePresence[]
//   checkedAt: Date
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Delete & Dependency Operations
// // ─────────────────────────────────────────────────────────────────────────────

// export interface ComponentDependencyWarning {
//   file: ModelFile
//   /**
//    * If this file is a 'component' (like a t5xxl), deleting it will break
//    * these specific architectures that rely on it.
//    */
//   dependentArchitectures: ModelArchitecture[]
// }

// export interface DeleteModelResult {
//   deleted: ModelFile[]
//   /**
//    * Warns the user that they just ripped out a universal component
//    * and collateral damage occurred to other architectures.
//    */
//   dependencyWarnings: ComponentDependencyWarning[]
//   deletedCount: number
// }

// export interface DeleteArchResult extends DeleteModelResult {
//   arch: ModelArchitecture
// }

// // ─────────────────────────────────────────────────────────────────────────────
// // Dry-run (Preview before delete)
// // ─────────────────────────────────────────────────────────────────────────────

// export interface DeleteArchPreview {
//   arch: ModelArchitecture
//   /** The base engine files (checkpoint/dit) that will be safely destroyed */
//   toDelete: ModelFile[]
//   /** * The universal components (t5xxl, vae) that the UI should suggest
//    * LEAVING ALONE because other architectures need them.
//    */
//   dependencyWarnings: ComponentDependencyWarning[]
//   totalSizeMb: number
// }
