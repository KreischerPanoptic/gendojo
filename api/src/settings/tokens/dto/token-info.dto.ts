import { ApiProperty } from "@nestjs/swagger";

export class TokenInfoDto {
  @ApiProperty({
    description: 'Whether a token is currently stored (in DB or env var)',
    example: true,
  })
  set: boolean;
 
  @ApiProperty({
    description:
      'Last 4 characters of the token prefixed with "..." for display purposes. ' +
      'null when no token is set.',
    example: '...f3aB',
    nullable: true,
    type: String,
  })
  hint: string | null;
 
  @ApiProperty({
    description: 'Source of the token: "db" (user-set via UI) or "env" (from environment variable)',
    enum: ['db', 'env', 'none'],
    example: 'db',
  })
  source: 'db' | 'env' | 'none';
}