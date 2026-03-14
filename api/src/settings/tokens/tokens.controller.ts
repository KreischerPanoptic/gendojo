import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Put,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';

import { TokensService } from './tokens.service';
import { TokensResponseDto } from './dto/tokens-response.dto';
import { UpdateTokensDto } from './dto/update-tokens.dto';

/**
 * GET    /settings/tokens        — masked token status (set flag + hint)
 * PUT    /settings/tokens        — upsert one or both tokens
 * DELETE /settings/tokens/:key   — clear a specific token from DB
 */
@ApiTags('Settings')
@ApiBearerAuth()
@Controller('settings/tokens')
export class TokensController {
  constructor(private readonly tokensService: TokensService) {}

  @Get()
  @ApiOperation({
    summary: 'Get token status',
    description:
      'Returns masked info for each token: presence flag, last-4 hint, and source (db/env/none). ' +
      'Raw token values are never returned. ' +
      'Source "env" means the token comes from an environment variable (HF_TOKEN / CIVITAI_TOKEN) ' +
      'and cannot be cleared via this API.',
  })
  @ApiResponse({ status: 200, description: 'Current token status', type: TokensResponseDto })
  get(): TokensResponseDto {
    return this.tokensService.getTokensResponse();
  }

  @Put()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Upsert one or both tokens',
    description:
      'Saves the provided token(s) to the database, encrypted with AES-256-GCM. ' +
      'Pass null to clear a specific token (env var fallback still applies). ' +
      'Omit a key entirely to leave its current value unchanged.',
  })
  @ApiBody({ type: UpdateTokensDto })
  @ApiResponse({ status: 200, description: 'Updated token status', type: TokensResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid token value' })
  async update(@Body() dto: UpdateTokensDto): Promise<TokensResponseDto> {
    return this.tokensService.update(dto);
  }

  @Delete(':key')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Clear a specific token from the database',
    description:
      'Removes the stored token. ' +
      'If an environment variable (HF_TOKEN / CIVITAI_TOKEN) is set, it will still be used as a fallback. ' +
      'To fully disable a token, both clear it here and unset the environment variable.',
  })
  @ApiParam({
    name: 'key',
    enum: ['hfToken', 'civitaiToken'],
    description: 'Which token to clear',
    example: 'hfToken',
  })
  @ApiResponse({ status: 200, description: 'Updated token status after clearing', type: TokensResponseDto })
  @ApiResponse({ status: 400, description: 'Unknown token key' })
  async clear(
    @Param('key') key: 'hfToken' | 'civitaiToken',
  ): Promise<TokensResponseDto> {
    return this.tokensService.clear(key);
  }
}