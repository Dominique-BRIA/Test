import { IsUUID, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class PredictLinkDto {
  @ApiProperty({
    description: 'UUID of the source node.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  source!: string;

  @ApiProperty({
    description: 'UUID of the candidate target node.',
    example: '550e8400-e29b-41d4-a716-446655440002',
  })
  @IsUUID()
  target!: string;

  @ApiProperty({
    description:
      'Relation type to predict. Must match the edge types used in your graph. ' +
      'The pipeline computes features specific to this relation type.',
    example: 'enrolled_in',
  })
  @IsString()
  relation_type!: string;
}
