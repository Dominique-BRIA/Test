import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWorkspaceDto {
  @ApiProperty({
    description: 'Human-readable name for this workspace.',
    example: 'school-graph-prod',
  })
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({
    description:
      'Domain that labels the node types in this graph. ' +
      'Built-in scoring providers exist for: education, renting, bookstore, manufacturing. ' +
      'Pass any custom string to use your own providers.',
    example: 'education',
  })
  @IsString()
  @IsNotEmpty()
  adapter_name!: string;

  @ApiPropertyOptional({
    description: 'Optional free-text description.',
    example: 'Primary graph for the 2026 cohort',
  })
  @IsString()
  @IsOptional()
  description?: string;
}
