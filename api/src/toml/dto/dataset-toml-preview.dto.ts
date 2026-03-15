import { ApiProperty } from "@nestjs/swagger";

export class DatasetTomlPreviewResponseDto {
  @ApiProperty({
    description: 'Generated dataset.toml content ready for --dataset_config',
    example: '[general]\nshuffle_caption = true\n\n[[datasets]]\nresolution = 1024\n\n  [[datasets.subsets]]\n  image_dir = "/workspace/datasets/my_char"\n  num_repeats = 10\n',
  })
  toml: string;
}