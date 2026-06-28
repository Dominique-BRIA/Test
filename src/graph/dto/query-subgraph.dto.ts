import { IsUUID, IsInt, Min, Max, IsArray, IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class QuerySubgraphDto {
  @ApiProperty({
    description: 'UUID of the root node from which traversal starts.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  rootNode!: string;

  @ApiProperty({
    description:
      'Maximum traversal depth (1–5 hops). ' +
      'Depth 2 typically covers 80% of relevant neighbours. Depth > 3 may be slow on large graphs.',
    example: 2,
    minimum: 1,
    maximum: 5,
  })
  @IsInt()
  @Min(1)
  @Max(5)
  depth!: number;

  @ApiProperty({
    description:
      'Only traverse edges of these relationship types. ' +
      'Must be a non-empty array matching the `type` values used when creating edges.',
    example: ['enrolled_in', 'mentors'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  relationTypes!: string[];

  @ApiPropertyOptional({
    description: 'Filter returned nodes to these types only. Omit to return all node types.',
    example: ['course', 'skill'],
    type: [String],
  })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  nodeTypes?: string[];
}
