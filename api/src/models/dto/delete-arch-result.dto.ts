import { ApiProperty } from "@nestjs/swagger";
import { DeleteModelResultDto } from "./delete-model-result.dto";

export class DeleteArchResultDto extends DeleteModelResultDto {
  @ApiProperty({ example: 'flux' })
  arch: string;
}