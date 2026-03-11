import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import * as fsp from 'fs/promises';
import * as path from 'path';
import type {
  TokensSettings,
  TokensResponse,
  UpdateTokensDto,
} from './entities/tokens.types';

/**
 * TokensService
 *
 * Stores HF and CivitAI tokens in /workspace/gendojo/settings.json
 * under the "tokens" key. Falls back to environment variables if no
 * persisted value is found (so existing Docker env vars keep working).
 *
 * Raw token values are NEVER returned to the client — only a set flag
 * and the last-4-char hint. The downloader reads tokens via getTokens().
 */
@Injectable()
export class TokensService implements OnModuleInit {
  private readonly logger = new Logger(TokensService.name);
  private readonly settingsPath: string;

  private tokens: TokensSettings = {
    hfToken: null,
    civitaiToken: null,
  };

  constructor() {
    this.settingsPath =
      process.env['GENDOJO_SETTINGS_PATH'] ??
      '/workspace/gendojo/settings.json';
  }

  async onModuleInit(): Promise<void> {
    await this.load();
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  /**
   * Returns masked token info for the UI.
   * Never exposes raw values.
   */
  getTokensResponse(): TokensResponse {
    const hf = this.resolveToken('hfToken', 'HF_TOKEN');
    const civitai = this.resolveToken('civitaiToken', 'CIVITAI_TOKEN');

    return {
      hfToken: {
        set: hf !== null,
        hint: hf ? `...${hf.slice(-4)}` : null,
      },
      civitaiToken: {
        set: civitai !== null,
        hint: civitai ? `...${civitai.slice(-4)}` : null,
      },
    };
  }

  /**
   * Returns raw token value for internal use (e.g. DownloaderService).
   * Prefers persisted settings over env vars.
   */
  getToken(key: 'hfToken' | 'civitaiToken'): string | null {
    const envKey = key === 'hfToken' ? 'HF_TOKEN' : 'CIVITAI_TOKEN';
    return this.resolveToken(key, envKey);
  }

  async update(dto: UpdateTokensDto): Promise<TokensResponse> {
    if ('hfToken' in dto) {
      this.tokens.hfToken = dto.hfToken ?? null;
    }
    if ('civitaiToken' in dto) {
      this.tokens.civitaiToken = dto.civitaiToken ?? null;
    }

    await this.persist();
    return this.getTokensResponse();
  }

  /** Clear a specific token */
  async clear(key: 'hfToken' | 'civitaiToken'): Promise<TokensResponse> {
    this.tokens[key] = null;
    await this.persist();
    return this.getTokensResponse();
  }

  // ── Internals ───────────────────────────────────────────────────────────────

  private resolveToken(
    settingsKey: keyof TokensSettings,
    envKey: string,
  ): string | null {
    return this.tokens[settingsKey] ?? process.env[envKey] ?? null;
  }

  private async load(): Promise<void> {
    try {
      const raw = await fsp.readFile(this.settingsPath, 'utf-8');
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      const tokens = parsed['tokens'] as Partial<TokensSettings> | undefined;

      if (tokens) {
        this.tokens.hfToken = tokens.hfToken ?? process.env.HF_TOKEN ?? null;
        this.tokens.civitaiToken = tokens.civitaiToken ?? process.env.CIVITAI_TOKEN ?? null;
      }
      if(process.env.HF_TOKEN) {
        this.tokens.hfToken = process.env.HF_TOKEN
      }
      if(process.env.CIVITAI_TOKEN) {
        this.tokens.civitaiToken = process.env.CIVITAI_TOKEN;
      }

      this.logger.log('Tokens loaded from settings.json');
    } catch {
      // File may not exist yet — that's fine, we'll create it on first write
      this.logger.debug('No tokens in settings.json — using env vars only');
    }
  }

  private async persist(): Promise<void> {
    try {
      // Read the full settings file first to preserve other sections
      let existing: Record<string, unknown> = {};
      try {
        const raw = await fsp.readFile(this.settingsPath, 'utf-8');
        existing = JSON.parse(raw) as Record<string, unknown>;
      } catch {
        // File doesn't exist yet — start fresh
      }

      existing['tokens'] = {
        hfToken: this.tokens.hfToken,
        civitaiToken: this.tokens.civitaiToken,
      };

      await fsp.mkdir(path.dirname(this.settingsPath), { recursive: true });
      await fsp.writeFile(
        this.settingsPath,
        JSON.stringify(existing, null, 2),
        'utf-8',
      );
    } catch (err) {
      this.logger.error('Failed to persist tokens:', (err as Error).message);
      throw err;
    }
  }
}