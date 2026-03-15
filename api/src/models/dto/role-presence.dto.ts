import { ApiProperty } from "@nestjs/swagger";
import { ModelFileDto } from "./model-file.dto";

export class RolePresenceDto {
  @ApiProperty({ description: 'Model role', example: 'ae' })
  role: string;
 
  @ApiProperty({ description: 'Whether this role is required in the checked variant', example: true })
  required: boolean;
 
  @ApiProperty({ description: 'Whether at least one file was found for this role', example: true })
  present: boolean;
 
  @ApiProperty({
    description: 'Files found for this role in the expected directory',
    type: [ModelFileDto],
  })
  files: ModelFileDto[];
 
  @ApiProperty({
    description: 'Expected directory relative to models root (e.g. "shared/ae", "flux")',
    example: 'shared/ae',
  })
  expectedDir: string;
}