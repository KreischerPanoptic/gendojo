import { ApiProperty } from "@nestjs/swagger";
import { TokenInfoDto } from "./token-info.dto";

export class TokensResponseDto {
  @ApiProperty({
    description: 'HuggingFace API token status',
    type: () => TokenInfoDto,
  })
  hfToken: TokenInfoDto;
 
  @ApiProperty({
    description: 'CivitAI API token status',
    type: () => TokenInfoDto,
  })
  civitaiToken: TokenInfoDto;
}