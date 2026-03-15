import { ApiPropertyOptional } from "@nestjs/swagger";

export class ModelsOptionsDto {
  @ApiPropertyOptional({
    description: 'Architectures present on disk (excluding "unknown")',
    type: [String],
    example: ['flux', 'chroma', 'sdxl'],
  })
  architectures?: string[];
 
  @ApiPropertyOptional({
    description: 'Coarse types present on disk',
    type: [String],
    example: ['checkpoint', 'text_encoder'],
  })
  types?: string[];
 
  @ApiPropertyOptional({
    description: 'Roles present on disk',
    type: [String],
    example: ['dit', 'ae', 't5xxl'],
  })
  roles?: string[];
}