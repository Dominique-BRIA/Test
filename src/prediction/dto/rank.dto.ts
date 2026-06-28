import { IsUUID, IsArray, ArrayMinSize, ArrayMaxSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RankDto {
  @ApiProperty({
    description: 'UUID of the query node.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  source!: string;

  @ApiProperty({
    description:
      'List of candidate node UUIDs to rank against the source (1–50). ' +
      'Each candidate receives an independent link prediction score.',
    example: [
      '550e8400-e29b-41d4-a716-446655440002',
      '550e8400-e29b-41d4-a716-446655440003',
    ],
    type: [String],
    minItems: 1,
    maxItems: 50,
  })
  @IsArray()
  @IsUUID('4', { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  candidates!: string[];
}
