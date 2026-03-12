import {
  Body,
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from './auth.service';
import { LoginDto, LoginResponseDto } from './dto/login.dto';
import {
  MfaTokenDto,
  MfaSetupResponseDto,
  MfaEnableResponseDto,
  MfaVerifyResponseDto,
} from './dto/mfa.dto';
import { SkipAuth } from './skip-auth.decorator';

/** Shape of the JWT payload attached by AuthGuard */
interface JwtPayload {
  sub: string;
  username: string;
}

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // ── Login ──────────────────────────────────────────────────────────────────

  @SkipAuth()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Authenticate user and return JWT',
    description:
      'Validates username + password against the stored admin user. ' +
      'If MFA is enabled, the returned token has a short TTL and the ' +
      'client must complete `/auth/mfa/verify` to receive a full-session token.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Successful login', type: LoginResponseDto })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  // ── MFA setup ─────────────────────────────────────────────────────────────

  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Generate a new TOTP secret and QR code',
    description:
      'Creates a fresh TOTP secret for the authenticated user and returns a ' +
      'scannable QR code (base64 PNG data URL) and raw `otpauth://` URI. ' +
      'MFA is **not** enabled yet — call `/auth/mfa/enable` with a valid token ' +
      'to confirm setup and activate it.',
  })
  @ApiResponse({ status: 200, description: 'TOTP secret generated', type: MfaSetupResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async setupMfa(@Req() req: Request): Promise<MfaSetupResponseDto> {
    const userId = this.extractUserId(req);
    const result = await this.authService.generateMfaSecret(userId);

    if (!result) {
      throw new UnauthorizedException('User not found');
    }

    return result;
  }

  // ── MFA enable ────────────────────────────────────────────────────────────

  @Post('mfa/enable')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Verify TOTP token and permanently enable MFA',
    description:
      'Accepts the six-digit token from the authenticator app and, if valid, ' +
      'flips `isMfaEnabled = true` for the user. Must be called after `/auth/mfa/setup`. ' +
      'Subsequent logins will require a TOTP token.',
  })
  @ApiBody({ type: MfaTokenDto })
  @ApiResponse({ status: 200, description: 'MFA enabled', type: MfaEnableResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized or invalid token' })
  async enableMfa(
    @Req() req: Request,
    @Body() dto: MfaTokenDto,
  ): Promise<MfaEnableResponseDto> {
    const userId = this.extractUserId(req);
    const enabled = await this.authService.verifyAndEnableMfa(userId, dto.token);

    if (!enabled) {
      throw new UnauthorizedException('Invalid TOTP token — MFA not enabled');
    }

    return { enabled };
  }

  // ── MFA verify ────────────────────────────────────────────────────────────

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Validate a TOTP token for the authenticated user',
    description:
      'One-shot check: returns `{ valid: true }` if the token is correct, ' +
      '`{ valid: false }` otherwise. Designed for the second factor in a ' +
      'two-step login flow — client presents a short-lived JWT from `/auth/login`, ' +
      'then exchanges it here for confirmation before accessing protected routes.',
  })
  @ApiBody({ type: MfaTokenDto })
  @ApiResponse({ status: 200, description: 'Validation result', type: MfaVerifyResponseDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async verifyMfa(
    @Req() req: Request,
    @Body() dto: MfaTokenDto,
  ): Promise<MfaVerifyResponseDto> {
    const userId = this.extractUserId(req);
    const valid = await this.authService.validateMfaToken(userId, dto.token);
    return { valid: valid.valid };
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  /**
   * Pulls `sub` (userId) out of the JWT payload that AuthGuard attaches
   * to `request.user`. Throws 401 if the guard somehow let a bad token through.
   */
  private extractUserId(req: Request): string {
    const user = req['user'] as JwtPayload | undefined;
    if (!user?.sub) {
      throw new UnauthorizedException('Could not resolve user from token');
    }
    return user.sub;
  }
}