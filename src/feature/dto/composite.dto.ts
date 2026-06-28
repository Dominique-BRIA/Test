import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompositeDto {
  @ApiProperty({
    description:
      'List of registered provider names to invoke. ' +
      'Results are merged into a single feature dictionary keyed by provider name.',
    example: ['skill-similarity', 'community_overlap', 'feature_score'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  providers!: string[];

  @ApiProperty({
    description: 'UUID of the source node.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsString()
  source!: string;

  @ApiProperty({
    description: 'UUID of the target node.',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsString()
  target!: string;
}
