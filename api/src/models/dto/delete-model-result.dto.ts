import { ApiProperty } from "@nestjs/swagger";
import { ModelFileDto } from "./model-file.dto";
import { SharedFileWarningDto } from "./shared-file-warning.dto";

export class DeleteModelResultDto {
  @ApiProperty({ description: 'Files successfully deleted from disk', type: [ModelFileDto] })
  deleted: ModelFileDto[];
 
  @ApiProperty({
    description: 'Deleted files that were also used by other architectures',
    type: [SharedFileWarningDto],
  })
  sharedWarnings: SharedFileWarningDto[];
 
  @ApiProperty({ description: 'Number of files actually removed from disk', example: 1 })
  deletedCount: number;
}