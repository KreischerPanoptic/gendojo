import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, Length } from 'class-validator';

// ─── Request DTOs ─────────────────────────────────────────────────────────────

export class MfaTokenDto {
  @ApiProperty({
    description: 'Six-digit TOTP token from authenticator app',
    example: '123456',
    minLength: 6,
    maxLength: 6,
  })
  @IsString()
  @IsNotEmpty()
  @Length(6, 6)
  token: string;
}

// ─── Response DTOs ───────────────────────────────────────────────────────────

export class MfaSetupResponseDto {
  @ApiProperty({
    description: 'Base32-encoded TOTP secret (store securely)',
    example: 'JBSWY3DPEHPK3PXP',
  })
  secret: string;

  @ApiProperty({
    description: 'QR code as base64 data URL (png). Scan with any TOTP app.',
    example: 'data:image/png;base64,iVBORw0KGgo...',
  })
  qrCode: string;

  @ApiProperty({
    description: 'Raw otpauth:// URI for manual entry',
    example: 'otpauth://totp/GenDojo:admin?secret=JBSWY3DPEHPK3PXP&issuer=GenDojo',
  })
  url: string;
}

export class MfaEnableResponseDto {
  @ApiProperty({
    description: 'Whether MFA was successfully enabled',
    example: true,
  })
  enabled: boolean;
}

export class MfaVerifyResponseDto {
  @ApiProperty({
    description: 'Whether the provided TOTP token is valid',
    example: true,
  })
  valid: boolean;
}