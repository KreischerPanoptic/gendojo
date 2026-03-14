// ─────────────────────────────────────────────────────────────────────────────
// Internal types
// ─────────────────────────────────────────────────────────────────────────────
 
export type TokenType = 'huggingface' | 'civitai';
 
/** In-memory cache entry — stores the decrypted raw value */
export interface TokenCacheEntry {
  raw: string;
  hint: string;
}
 
/** Map of in-memory token cache, keyed by TokenType */
export type TokenCache = Partial<Record<TokenType, TokenCacheEntry>>;