import { ApiPropertyOptional } from "@nestjs/swagger";

export class AllOptionsDto {
  @ApiPropertyOptional({ type: [String], example: ['flux', 'sdxl', 'sd3'] })
  architectures?: string[];
 
  @ApiPropertyOptional({ type: [String], example: ['checkpoint', 'lora', 'vae', 'text_encoder'] })
  types?: string[];
 
  @ApiPropertyOptional({ type: [String], example: ['dit', 'ae', 'clip_l', 't5xxl', 'gemma2'] })
  roles?: string[];
}