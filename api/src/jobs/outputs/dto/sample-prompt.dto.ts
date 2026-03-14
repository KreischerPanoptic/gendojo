import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SamplePromptDto {
  @ApiProperty({
    description: '0-based index — corresponds to the _NN suffix in preview filenames',
    example: 0,
  })
  index: number;
 
  @ApiProperty({
    description: 'Prompt text as written in prompts.txt (activation token included)',
    example: 'token. A warrior standing in a forest, cinematic lighting',
  })
  prompt: string;
 
  @ApiPropertyOptional({
    description: 'Negative prompt (--n flag)',
    example: 'blurry, low quality, watermark',
    nullable: true,
    type: String,
  })
  negativePrompt?: string;
 
  @ApiPropertyOptional({ description: 'Seed (--d flag)', example: 42, nullable: true, type: Number })
  seed?: number;
 
  @ApiPropertyOptional({ description: 'Width in pixels (--w flag)', example: 1024, nullable: true, type: Number })
  width?: number;
 
  @ApiPropertyOptional({ description: 'Height in pixels (--h flag)', example: 1024, nullable: true, type: Number })
  height?: number;
 
  @ApiPropertyOptional({ description: 'Sampling steps (--s flag)', example: 28, nullable: true, type: Number })
  steps?: number;
 
  @ApiPropertyOptional({ description: 'CFG / guidance scale (--c flag)', example: 7.0, nullable: true, type: Number })
  cfg?: number;
}