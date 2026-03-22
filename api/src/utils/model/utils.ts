// ─────────────────────────────────────────────────────────────────────────────
// Helper — resolve the target directory for a given (arch, role) pair.
// Falls back to `<arch>/` if the combo is not explicitly mapped.
// Returns null when arch is 'unknown'.
// ─────────────────────────────────────────────────────────────────────────────

import { ARCH_ROLE_DIR } from "../../models/constants/models.constants";
import { ModelArchitecture, ModelRole } from "../../models/types/models.types";

export function resolveTargetDir(
  arch: ModelArchitecture,
  role: ModelRole,
): string | null {
  if (arch === "unknown") return null;
  return ARCH_ROLE_DIR[arch][role] ?? arch;
}
