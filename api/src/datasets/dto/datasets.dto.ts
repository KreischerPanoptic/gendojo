import { ApiProperty } from '@nestjs/swagger';

export class CaptionStatsDto {
  @ApiProperty() charCount: number;
  @ApiProperty() wordCount: number;
  @ApiProperty() isLongForClip: boolean;
  @ApiProperty() isLongForT5: boolean;
}

export class DatasetMetaDto {
  @ApiProperty({ nullable: true, type: String })
  activationToken: string | null;

  @ApiProperty({ enum: ['tag_list', 'natural_language', 'mixed', 'unknown'] })
  captionType: string;

  @ApiProperty() notes: string;
  @ApiProperty() createdAt: string;
}

export class DatasetImageDto {
  @ApiProperty() filename: string;
  @ApiProperty() path: string;
  @ApiProperty() sizeBytes: number;
  @ApiProperty() hasCaption: boolean;

  @ApiProperty({ type: () => CaptionStatsDto, nullable: true })
  captionStats: CaptionStatsDto | null;
}

export class DatasetSummaryDto {
  @ApiProperty() name: string;
  @ApiProperty() path: string;
  @ApiProperty() imageCount: number;
  @ApiProperty() captionedCount: number;
  @ApiProperty() captionCoverage: number;
  @ApiProperty() updatedAt: string;

  @ApiProperty({ type: () => DatasetMetaDto, nullable: true })
  meta: DatasetMetaDto | null;
}

export class DatasetDetailDto extends DatasetSummaryDto {
  @ApiProperty({ type: [DatasetImageDto] })
  images: DatasetImageDto[];

  // Тут тоже нужен DTO для CaptionLengthSummary, если он есть
  @ApiProperty({ nullable: true }) 
  captionLengthSummary: any; // Замени на нормальный класс
}