import { ApiProperty } from "@nestjs/swagger";

export class ModelFileDto {
  @ApiProperty({
    description: 'Stable identifier — relative path from models root (URL-encoded in API calls)',
    example: 'flux/flux1-dev.safetensors',
  })
  id: string;
 
  @ApiProperty({ description: 'Filename without extension', example: 'flux1-dev' })
  name: string;
 
  @ApiProperty({ description: 'Full filename', example: 'flux1-dev.safetensors' })
  filename: string;
 
  @ApiProperty({ description: 'Relative path from models root', example: 'flux/flux1-dev.safetensors' })
  relativePath: string;
 
  @ApiProperty({ description: 'Absolute path on disk', example: '/workspace/models/flux/flux1-dev.safetensors' })
  absolutePath: string;
 
  @ApiProperty({ enum: ['.safetensors', '.ckpt', '.pt', '.bin'], example: '.safetensors' })
  extension: string;
 
  @ApiProperty({ description: 'File size in bytes', example: 24953856000 })
  sizeBytes: number;
 
  @ApiProperty({ description: 'File size in MB (1 decimal)', example: 23789.5 })
  sizeMb: number;
 
  @ApiProperty({
    enum: ['sd1', 'sd2', 'sdxl', 'flux', 'chroma', 'sd3', 'anima', 'lumina', 'hunyuan', 'unknown'],
    description:
      'Best-guess architecture. "unknown" for files in shared/ — they serve multiple architectures.',
    example: 'flux',
  })
  arch: string;
 
  @ApiProperty({
    description:
      'Architectures that also use this file. ' +
      'Non-empty only for files in shared/ directories (e.g. shared/ae/, shared/text_encoders/). ' +
      'When arch="unknown", this field tells the UI which architectures depend on the file.',
    type: [String],
    example: ['flux', 'chroma', 'lumina'],
  })
  sharedWith: string[];

  @ApiProperty({
    description:
      'Granular role — determines which CLI argument this file is passed to during training. ' +
      'e.g. ae → --ae, t5xxl → --t5xxl, dit → --pretrained_model_name_or_path',
    example: 'dit',
  })
  role: string;
 
  @ApiProperty({
    enum: ['checkpoint', 'lora', 'vae', 'text_encoder', 'unknown'],
    description: 'Coarse category — use for simple UI filtering',
    example: 'checkpoint',
  })
  type: string;
 
  @ApiProperty({ description: 'Last modified timestamp', example: '2026-03-08T22:00:00.000Z' })
  modifiedAt: Date;
}