import { IsUUID, IsString, IsNumber, IsOptional, IsISO8601, IsIn } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WeightStrategy } from '../../shared/types';

export class CreateEdgeDto {
  @ApiProperty({
    description: 'Workspace this edge belongs to.',
    example: 'c0473e6e-a61e-4cea-a8b5-8bdeaae327cc',
  })
  @IsUUID()
  workspace_id!: string;

  @ApiProperty({
    description: 'UUID of the source (origin) node.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  source_id!: string;

  @ApiProperty({
    description: 'UUID of the target (destination) node.',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  target_id!: string;

  @ApiProperty({
    description:
      'Semantic type of this relationship. ' +
      'Examples: enrolled_in, mentors, rented_by, purchased, co_authored.',
    example: 'enrolled_in',
  })
  @IsString()
  type!: string;

  @ApiPropertyOptional({
    description: 'Numeric weight of the edge (default 1.0). Higher = stronger relationship.',
    example: 0.85,
    default: 1.0,
  })
  @IsNumber()
  @IsOptional()
  weight?: number;

  @ApiPropertyOptional({
    description:
      'How the edge weight is managed. ' +
      '"explicit" (default): developer-supplied value. ' +
      '"temporal": base weight stored; exponential decay applied at scoring time. ' +
      '"auto": platform infers weight from historical interaction frequency at creation time.',
    enum: ['explicit', 'temporal', 'auto'],
    default: 'explicit',
  })
  @IsIn(['explicit', 'temporal', 'auto'])
  @IsOptional()
  weight_strategy?: WeightStrategy;

  @ApiPropertyOptional({
    description: 'ISO-8601 timestamp when this event occurred. Defaults to NOW().',
    example: '2026-09-01T08:00:00Z',
  })
  @IsISO8601()
  @IsOptional()
  timestamp?: string;
}
