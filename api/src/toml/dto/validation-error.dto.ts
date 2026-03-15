import { ApiProperty } from "@nestjs/swagger";

export class ValidationErrorDto {
  @ApiProperty({
    description: 'Dot-notated field path that failed validation',
    example: 'guidance_scale',
  })
  field: string;
 
  @ApiProperty({
    description: 'Human-readable description of the constraint that was violated',
    example: 'guidance_scale must be set for FLUX training (use 1.0 to disable embedded guidance)',
  })
  message: string;
}
 
export class ValidationResultDto {
  @ApiProperty({ description: 'True when all constraints pass', example: true })
  valid: boolean;
 
  @ApiProperty({
    description: 'List of field-level validation errors. Empty when valid=true.',
    type: [ValidationErrorDto],
  })
  errors: ValidationErrorDto[];
}