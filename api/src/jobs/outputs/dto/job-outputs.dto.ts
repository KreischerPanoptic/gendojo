import { ApiProperty } from "@nestjs/swagger";
import { CheckpointDto } from "./checkpoint.dto";
import { SamplePromptDto } from "./sample-prompt.dto";

export class JobOutputsDto {
  @ApiProperty({
    description: 'Absolute path to the output directory for this job',
    example: '/workspace/outputs/lora/a1b2c3d4-2026-03-08T22-00-00',
  })
  outputDir: string;
 
  @ApiProperty({
    description:
      'Absolute path to the sample/ subdirectory. ' +
      'null when sample generation was not configured or has not run yet.',
    example: '/workspace/outputs/lora/a1b2c3d4-2026-03-08T22-00-00/sample',
    nullable: true,
    type: String,
  })
  sampleDir: string | null;
 
  @ApiProperty({
    description:
      'Checkpoints found in outputDir, sorted by epoch/step ascending. ' +
      'The final checkpoint (no epoch/step) always appears last.',
    type: [CheckpointDto],
  })
  checkpoints: CheckpointDto[];
 
  @ApiProperty({
    description:
      'Prompts parsed from prompts.txt. ' +
      'Empty array when no sample_prompts was configured for this job. ' +
      'Indexed by CheckpointPreview.promptIndex.',
    type: [SamplePromptDto],
  })
  prompts: SamplePromptDto[];
}