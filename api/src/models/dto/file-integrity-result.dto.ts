import { ApiProperty } from "@nestjs/swagger";

export class FileIntegrityResultDto {
  @ApiProperty({ description: 'File ID (relative path)', example: 'flux/flux1-dev.safetensors' })
  id: string;
 
  @ApiProperty({ example: 'flux1-dev.safetensors' })
  filename: string;
 
  @ApiProperty({
    enum: ['ok', 'corrupted', 'unknown'],
    description:
      '"ok" — hash matches registry. ' +
      '"corrupted" — hash mismatch; file may be truncated or damaged. ' +
      '"unknown" — no hash registered for this file (integrity cannot be verified).',
    example: 'ok',
  })
  status: string;
 
  @ApiProperty({
    description: 'SHA-256 hash computed from the file on disk (lowercase hex, 64 chars)',
    example: '4610115bb0c89560703c892c59ac2742fa821e60ef5871b33493ba544683abd7',
  })
  computedSha256: string;
 
  @ApiProperty({
    description: 'Expected SHA-256 from the registry. null when status is "unknown".',
    nullable: true,
    type: String,
    example: '4610115bb0c89560703c892c59ac2742fa821e60ef5871b33493ba544683abd7',
  })
  expectedSha256: string | null;
 
  @ApiProperty({ example: 23789.5 })
  sizeMb: number;
 
  @ApiProperty({ description: 'ISO timestamp of when the check was performed', example: '2026-03-08T22:00:00.000Z' })
  checkedAt: Date;
}