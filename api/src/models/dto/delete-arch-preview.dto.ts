import { ApiProperty } from "@nestjs/swagger";
import { ModelFileDto } from "./model-file.dto";
import { SharedFileWarningDto } from "./shared-file-warning.dto";

export class DeleteArchPreviewDto {
  @ApiProperty({ example: 'flux' })
  arch: string;
 
  @ApiProperty({ description: 'Files that would be deleted', type: [ModelFileDto] })
  toDelete: ModelFileDto[];
 
  @ApiProperty({
    description:
      'Files that would be deleted AND are also used by other architectures. ' +
      'The UI should display these as warnings before calling DELETE /models/arch/:arch.',
    type: [SharedFileWarningDto],
  })
  sharedWarnings: SharedFileWarningDto[];
 
  @ApiProperty({ description: 'Total size of files that would be deleted (MB)', example: 34012.3 })
  totalSizeMb: number;
}