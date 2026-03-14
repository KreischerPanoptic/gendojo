import {
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
} from 'crypto';

import { Token } from './entities/token.entity';
import { TokenCache, TokenType } from './types/tokens.types';
import { TokensResponseDto } from './dto/tokens-response.dto';
import { UpdateTokensDto } from './dto/update-tokens.dto';
// ─────────────────────────────────────────────────────────────────────────────
// Encryption constants
// ─────────────────────────────────────────────────────────────────────────────

const ALGORITHM  = 'aes-256-gcm';
const IV_BYTES   = 16;
const KEY_BYTES  = 32;
const TAG_BYTES  = 16;

/**
 * Fixed application-level salt for key derivation.
 * This is NOT a secret — it only ensures the derived key is domain-separated
 * from other uses of APP_SECRET in the application.
 * Per-value security comes from the random IV generated on each encryption.
 */
const KDF_SALT = 'gendojo:tokens:v1';

// ─────────────────────────────────────────────────────────────────────────────
// TokensService
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Manages HuggingFace and CivitAI API tokens.
 *
 * Storage strategy:
 *   - Tokens are persisted in the `tokens` SQLite table, encrypted with
 *     AES-256-GCM. The encryption key is derived from APP_SECRET via scrypt.
 *   - Environment variables (HF_TOKEN, CIVITAI_TOKEN) act as a read-only
 *     fallback — they are never written to the DB.
 *   - An in-memory cache is populated at startup and kept in sync on every
 *     write, so getToken() is always O(1) — no DB hit on the hot path.
 *
 * Encrypted storage format (stored in Token.token column):
 *   `{iv_hex}:{authTag_hex}:{ciphertext_hex}`
 *
 * Raw token values are NEVER returned to the client. The UI only receives
 * { set: boolean, hint: "...last4", source: "db"|"env"|"none" }.
 */
@Injectable()
export class TokensService implements OnModuleInit {
  private readonly logger = new Logger(TokensService.name);

  /** Derived encryption key — computed once from APP_SECRET at startup */
  private readonly encryptionKey: Buffer;

  /**
   * In-memory cache of decrypted token values.
   * Updated on every write; populated from DB on startup.
   * getToken() reads from here exclusively — no DB I/O on hot path.
   */
  private readonly cache: TokenCache = {};

  constructor(
    @InjectRepository(Token)
    private readonly tokenRepo: Repository<Token>,
  ) {
    this.encryptionKey = this.deriveKey();
  }

  async onModuleInit(): Promise<void> {
    await this.warmCache();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Returns masked token info for the UI.
   * Raw values are never exposed — only presence flag, hint, and source.
   */
  getTokensResponse(): TokensResponseDto {
    return {
      hfToken:      this.buildTokenInfo('huggingface', 'HF_TOKEN'),
      civitaiToken: this.buildTokenInfo('civitai', 'CIVITAI_TOKEN'),
    };
  }

  /**
   * Returns the raw token value for internal use (e.g. DownloaderService).
   * Priority: DB (decrypted) → environment variable → null.
   */
  getToken(key: 'hfToken' | 'civitaiToken'): string | null {
    const type: TokenType = key === 'hfToken' ? 'huggingface' : 'civitai';
    const envKey = key === 'hfToken' ? 'HF_TOKEN' : 'CIVITAI_TOKEN';

    return this.cache[type]?.raw ?? process.env[envKey] ?? null;
  }

  /**
   * Upsert one or both tokens.
   * Passing null for a key clears the stored token (env fallback still applies).
   */
  async update(dto: UpdateTokensDto): Promise<TokensResponseDto> {
    if ('hfToken' in dto) {
      await this.upsertToken('huggingface', dto.hfToken ?? null);
    }
    if ('civitaiToken' in dto) {
      await this.upsertToken('civitai', dto.civitaiToken ?? null);
    }
    return this.getTokensResponse();
  }

  /**
   * Clear a specific token from the DB.
   * The env var fallback (if any) will still be used by getToken().
   */
  async clear(key: 'hfToken' | 'civitaiToken'): Promise<TokensResponseDto> {
    const type: TokenType = key === 'hfToken' ? 'huggingface' : 'civitai';
    await this.upsertToken(type, null);
    return this.getTokensResponse();
  }

  // ── Private: DB operations ─────────────────────────────────────────────────

  /**
   * Upsert a token record.
   *   - value = string  → encrypt and save; update cache
   *   - value = null    → delete record (if exists); clear cache entry
   */
  private async upsertToken(type: TokenType, value: string | null): Promise<void> {
    if (value === null) {
      await this.tokenRepo.delete({ type });
      delete this.cache[type];
      this.logger.log(`Cleared ${type} token from DB`);
      return;
    }

    const hint      = this.computeHint(value);
    const encrypted = this.encrypt(value);

    // Upsert — update if exists, insert if not
    const existing = await this.tokenRepo.findOne({ where: { type } });

    if (existing) {
      existing.token = encrypted;
      existing.hint  = hint;
      await this.tokenRepo.save(existing);
    } else {
      const record = this.tokenRepo.create({ type, token: encrypted, hint });
      await this.tokenRepo.save(record);
    }

    // Sync in-memory cache immediately
    this.cache[type] = { raw: value, hint };
    this.logger.log(`Saved ${type} token to DB (hint: ...${hint})`);
  }

  /**
   * Load all token records from DB at startup and populate the in-memory cache.
   * Must explicitly select the `token` column (it has `select: false`).
   */
  private async warmCache(): Promise<void> {
    const records = await this.tokenRepo.find({
      select: ['id', 'type', 'token', 'hint'],
    });

    let loaded = 0;
    for (const record of records) {
      try {
        const raw = this.decrypt(record.token);
        this.cache[record.type] = { raw, hint: record.hint };
        loaded++;
      } catch (err) {
        // Decryption failure = wrong APP_SECRET or corrupted record
        this.logger.warn(
          `Could not decrypt ${record.type} token — skipping. ` +
          `Ensure APP_SECRET has not changed. Error: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(`Token cache warmed: ${loaded}/${records.length} records loaded`);
  }

  // ── Private: response builder ──────────────────────────────────────────────

  private buildTokenInfo(
    type: TokenType,
    envKey: string,
  ): TokensResponseDto['hfToken'] {
    const fromCache = this.cache[type];
    if (fromCache) {
      return { set: true, hint: `...${fromCache.hint}`, source: 'db' };
    }

    const fromEnv = process.env[envKey];
    if (fromEnv) {
      return { set: true, hint: `...${this.computeHint(fromEnv)}`, source: 'env' };
    }

    return { set: false, hint: null, source: 'none' };
  }

  // ── Private: encryption ────────────────────────────────────────────────────

  /**
   * Derive a 32-byte AES key from APP_SECRET using scrypt.
   *
   * scrypt is intentionally slow (cost factor N=16384) to make brute-forcing
   * APP_SECRET against leaked DB contents expensive.
   *
   * Falls back to a SHA-256 hash of a hard-coded dev string when APP_SECRET
   * is not set — this is secure enough for local dev but logs a clear warning.
   */
  private deriveKey(): Buffer {
    const secret = process.env['APP_SECRET'];

    if (!secret) {
      this.logger.warn(
        'APP_SECRET is not set — using insecure dev key. ' +
        'Set APP_SECRET in your environment for production deployments.',
      );
      // SHA-256 of a fixed dev string → deterministic 32-byte key
      return createHash('sha256').update('gendojo-dev-insecure-key').digest();
    }

    // scrypt: N=16384, r=8, p=1 → ~100ms on modern hardware
    return scryptSync(secret, KDF_SALT, KEY_BYTES, { N: 16384, r: 8, p: 1 }) as Buffer;
  }

  /**
   * Encrypt a plaintext string with AES-256-GCM.
   * Returns `{iv_hex}:{authTag_hex}:{ciphertext_hex}`.
   *
   * A fresh random IV is generated on every call — identical plaintexts
   * produce different ciphertexts, preventing frequency analysis.
   */
  private encrypt(plaintext: string): string {
    const iv     = randomBytes(IV_BYTES);
    const cipher = createCipheriv(ALGORITHM, this.encryptionKey, iv);

    const ciphertext = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    return [
      iv.toString('hex'),
      authTag.toString('hex'),
      ciphertext.toString('hex'),
    ].join(':');
  }

  /**
   * Decrypt a value produced by encrypt().
   * Throws on invalid format, wrong key, or tampered ciphertext.
   */
  private decrypt(stored: string): string {
    const parts = stored.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivHex, authTagHex, ciphertextHex] = parts;
    const iv         = Buffer.from(ivHex, 'hex');
    const authTag    = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');

    if (iv.length !== IV_BYTES) {
      throw new Error('Invalid IV length in encrypted token');
    }

    const decipher = createDecipheriv(ALGORITHM, this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
  }

  // ── Private: helpers ───────────────────────────────────────────────────────

  /** Last 4 characters of the raw token value */
  private computeHint(raw: string): string {
    return raw.length > 4 ? raw.slice(-4) : raw;
  }
}