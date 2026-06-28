import { IsUUID, IsArray, IsString, IsObject, IsIn, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PipelineConfig } from '../../shared/types';

class PipelineConfigDto implements PipelineConfig {
  @ApiProperty({
    description: 'List of feature/provider names to include in the pipeline.',
    example: ['community_overlap', 'feature_score'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  features!: string[];

  @ApiProperty({
    description:
      'Aggregation model:\n' +
      '- `mean` — average of all feature scores\n' +
      '- `max` — maximum feature score\n' +
      '- `weighted_sum` — weighted sum using `weights` map',
    enum: ['weighted_sum', 'mean', 'max'],
    example: 'mean',
  })
  @IsIn(['weighted_sum', 'mean', 'max'])
  model!: PipelineConfig['model'];

  @ApiPropertyOptional({
    description: 'Feature weights for `weighted_sum` model. Keys must match `features` list.',
    example: { community_overlap: 0.6, feature_score: 0.4 },
  })
  @IsObject()
  @IsOptional()
  weights?: Record<string, number>;
}

export class RunPipelineDto {
  @ApiProperty({
    description: 'UUID of the source node.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  sourceId!: string;

  @ApiProperty({
    description: 'UUID of the target node.',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  targetId!: string;

  @ApiProperty({
    description: 'UUID of the workspace (injected by the API key guard).',
    example: 'c0473e6e-a61e-4cea-a8b5-8bdeaae327cc',
  })
  @IsUUID()
  workspaceId!: string;

  @ApiProperty({
    description: 'Pipeline configuration — which features to compute and how to aggregate them.',
    type: PipelineConfigDto,
  })
  @IsObject()
  @Type(() => PipelineConfigDto)
  config!: PipelineConfigDto;
}
