import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Put,
} from '@nestjs/common';
import { TokensService } from './tokens.service';
import type { UpdateTokensDto } from './types/tokens.types';

@Controller('settings/tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  /**
   * GET /settings/tokens
   * Returns masked token info (set flag + last-4 hint).
   * Raw values are never exposed.
   */
  @Get()
  get() {
    return this.tokensService.getTokensResponse();
  }

  /**
   * PUT /settings/tokens
   * Upsert one or both tokens.
   *
   * { "hfToken": "hf_abc123..." }
   * { "civitaiToken": "abc..." }
   * { "hfToken": "hf_...", "civitaiToken": "abc..." }
   *
   * Pass null to clear a token (same as DELETE /:key).
   */
  @Put()
  update(@Body() dto: UpdateTokensDto) {
    return this.tokensService.update(dto);
  }

  /**
   * DELETE /settings/tokens/:key
   * Clear a specific token from persisted storage.
   * Falls back to env var if one is set.
   *
   * :key = "hfToken" | "civitaiToken"
   */
  @Delete(':key')
  clear(@Param('key') key: 'hfToken' | 'civitaiToken') {
    return this.tokensService.clear(key);
  }
}