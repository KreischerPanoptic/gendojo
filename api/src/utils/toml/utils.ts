// ─────────────────────────────────────────────────────────────────────────────
// Minimal TOML serialiser
//
// sd-scripts reads TOML with Python's `toml` library, which expects standard
// TOML 0.5.  We only need to handle:
//   - key = "string"
//   - key = 123
//   - key = 1.5
//   - key = true / false
//   - key = [1024, 768]           (inline array of numbers)
//   - key = ["a", "b"]            (inline array of strings)
//   - [section]
//   - [[array_of_tables]]
// ─────────────────────────────────────────────────────────────────────────────

export function tomlString(v: string): string {
  // Escape backslashes and double-quotes; wrap in double quotes.
  return `"${v.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;
}

export function tomlValue(v: unknown): string {
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return tomlString(v);
  if (Array.isArray(v)) {
    const items = v.map(item => tomlValue(item)).join(', ');
    return `[${items}]`;
  }
  throw new Error(`toml: unsupported value type: ${typeof v} (${String(v)})`);
}

/**
 * Serialise a flat Record into "key = value\n" pairs, skipping undefined.
 * Keys with undefined / null values are silently omitted.
 */
export function serializeFlat(obj: Record<string, unknown>): string {
  const lines: string[] = [];
  for (const [key, val] of Object.entries(obj)) {
    if (val === undefined || val === null) continue;
    lines.push(`${key} = ${tomlValue(val)}`);
  }
  return lines.join('\n');
}