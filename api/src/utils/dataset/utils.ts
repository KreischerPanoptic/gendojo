import * as path from 'path';
import { SUPPORTED_IMAGE_EXTS } from './dataset.types';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Returns lowercase extension WITHOUT the leading dot, e.g. "jpg" */
export function extOf(filename: string): string {
  return path.extname(filename).replace(/^\./, '').toLowerCase();
}

export function isImage(filename: string): boolean {
  return (SUPPORTED_IMAGE_EXTS as string[]).includes(extOf(filename));
}

export function isCaption(filename: string): boolean {
  return extOf(filename) === 'txt';
}

/** Strip extension from a filename, e.g. "cat.jpg" → "cat" */
export function stem(filename: string): string {
  return path.basename(filename, path.extname(filename));
}