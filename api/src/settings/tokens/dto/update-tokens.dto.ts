import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MinLength } from "class-validator";

export class UpdateTokensDto {
  @ApiPropertyOptional({
    description:
      'HuggingFace API token. Required for gated models (FLUX.1-dev, SD3.5, etc.). ' +
      'Pass null to clear the stored token.',
    example: 'hf_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  @MinLength(4)
  hfToken?: string | null;
 
  @ApiPropertyOptional({
    description:
      'CivitAI API token. Required for downloading models from civitai.com. ' +
      'Pass null to clear the stored token.',
    example: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  @MinLength(4)
  civitaiToken?: string | null;
}