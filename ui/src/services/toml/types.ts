// ─────────────────────────────────────────────────────────────────────────────
// Mirrors backend toml.controller.ts response shapes
// ─────────────────────────────────────────────────────────────────────────────

export interface TomlPreviewDatasetResponse {
  toml: string
}

export interface TomlPreviewTrainResponse {
  toml: string
  /** e.g. "flux_train_network.py" */
  script: string
  /** e.g. "networks.lora_flux" */
  networkModule: string
}

export interface TomlValidationError {
  field: string
  message: string
}

export interface TomlValidationResult {
  valid: boolean
  errors: TomlValidationError[]
}