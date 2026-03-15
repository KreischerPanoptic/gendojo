import type { ModelArchitecture, ModelFile, ModelRole } from './models.types';

// ─────────────────────────────────────────────────────────────────────────────
// File integrity check
// ─────────────────────────────────────────────────────────────────────────────

export type IntegrityStatus =
  | 'ok'          // computed hash matches registered hash
  | 'corrupted'   // computed hash does NOT match registered hash
  | 'unknown';    // no hash registered for this file — can't verify

export interface FileIntegrityResult {
  id: string;
  filename: string;
  status: IntegrityStatus;
  /** Always present — computed on every check */
  computedSha256: string;
  /** null when status is 'unknown' */
  expectedSha256: string | null;
  sizeMb: number;
  checkedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Architecture readiness check
// ─────────────────────────────────────────────────────────────────────────────

/** One role's presence status within an arch readiness check */
export interface RolePresence {
  role: ModelRole;
  /** Whether this role is required in the satisfied (or closest) variant */
  required: boolean;
  present: boolean;
  /** Actual files found in the expected directory for this arch+role */
  files: ModelFile[];
  /** Expected directory relative to models root, e.g. "flux/ae" */
  expectedDir: string;
}

export interface ArchReadinessResult {
  arch: ModelArchitecture;
  /** True if at least one role variant from ARCH_REQUIRED_ROLES is fully satisfied */
  ready: boolean;
  /**
   * The variant (role list) that is fully satisfied.
   * null when ready=false.
   */
  satisfiedVariant: ModelRole[] | null;
  /**
   * Missing roles from the closest-to-complete variant.
   * Empty when ready=true.
   */
  missingRoles: ModelRole[];
  /** Full presence breakdown for every role in the best variant */
  rolePresence: RolePresence[];
  checkedAt: Date;
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete operations
// ─────────────────────────────────────────────────────────────────────────────

export interface SharedFileWarning {
  file: ModelFile;
  /**
   * Architectures OTHER than the one being deleted that also rely on this
   * file's directory. Populated via ARCH_ROLE_DIR reverse-lookup.
   */
  sharedWithArches: ModelArchitecture[];
}

export interface DeleteModelResult {
  deleted: ModelFile[];
  /**
   * Files that were deleted but are also used by other architectures.
   * The UI should display these as warnings before calling the endpoint.
   */
  sharedWarnings: SharedFileWarning[];
  /** How many files were actually removed from disk */
  deletedCount: number;
}

export interface DeleteArchResult extends DeleteModelResult {
  arch: ModelArchitecture;
}

// ─────────────────────────────────────────────────────────────────────────────
// Dry-run (preview before delete)
// ─────────────────────────────────────────────────────────────────────────────

export interface DeleteArchPreview {
  arch: ModelArchitecture;
  /** Files that would be deleted */
  toDelete: ModelFile[];
  /** Subset of toDelete that are shared with other architectures */
  sharedWarnings: SharedFileWarning[];
  totalSizeMb: number;
}