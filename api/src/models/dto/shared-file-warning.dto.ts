import { ApiProperty } from "@nestjs/swagger";
import { ModelFileDto } from "./model-file.dto";

export class SharedFileWarningDto {
  @ApiProperty({ type: () => ModelFileDto })
  file: ModelFileDto;
 
  @ApiProperty({
    description:
      'Architectures OTHER than the deleted one that also rely on this file. ' +
      'e.g. deleting flux AE (shared/ae/) will warn that Chroma and Lumina also use it.',
    type: [String],
    example: ['chroma', 'lumina'],
  })
  sharedWithArches: string[];
}