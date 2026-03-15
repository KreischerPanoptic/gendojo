import { ApiProperty } from "@nestjs/swagger";
import { RolePresenceDto } from "./role-presence.dto";

export class ArchReadinessResultDto {
  @ApiProperty({ example: 'flux' })
  arch: string;
 
  @ApiProperty({
    description: 'True when at least one required role variant from ARCH_REQUIRED_ROLES is fully satisfied',
    example: true,
  })
  ready: boolean;
 
  @ApiProperty({
    description: 'The role variant that is fully satisfied. null when ready=false.',
    nullable: true,
    type: [String],
    example: ['dit', 'ae', 'clip_l', 't5xxl'],
  })
  satisfiedVariant: string[] | null;
 
  @ApiProperty({
    description: 'Roles missing from the closest-to-complete variant. Empty when ready=true.',
    type: [String],
    example: ['clip_l'],
  })
  missingRoles: string[];
 
  @ApiProperty({
    description: 'Presence breakdown for every role in the best variant',
    type: [RolePresenceDto],
  })
  rolePresence: RolePresenceDto[];
 
  @ApiProperty({ description: 'ISO timestamp of when the check was performed', example: '2026-03-08T22:00:00.000Z' })
  checkedAt: Date;
}