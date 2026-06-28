import { IsString, IsNotEmpty, IsInt, Min, Max, IsOptional, IsIn, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RankingStrategy } from '../../shared/types';

export class TopKDto {
  @ApiProperty({
    description: 'UUID of the query node. The engine finds the best targets for this node.',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  source!: string;

  @ApiProperty({
    description: 'Relation type to rank candidates for. Must match edges in your graph.',
    example: 'enrolled_in',
  })
  @IsString()
  @IsNotEmpty()
  relation!: string;

  @ApiProperty({
    description: 'Number of top candidates to return (1–100).',
    example: 10,
    minimum: 1,
    maximum: 100,
  })
  @IsInt()
  @Min(1)
  @Max(100)
  k!: number;

  @ApiPropertyOptional({
    description:
      'Scoring strategy:\n\n' +
      '| Strategy | Description | Best for |\n' +
      '|---|---|---|\n' +
      '| `similarity` | Cosine similarity between node embeddings | When you have pre-computed vectors |\n' +
      '| `influence` | PageRank × fitness score on the local subgraph | Identifying structurally important nodes |\n' +
      '| `community` | Label propagation — same-community nodes are boosted | Social graphs, topic clusters |\n' +
      '| `promising_node` | 40% features + 30% PageRank + 30% fitness | General-purpose balanced scoring |\n\n' +
      'Defaults to `promising_node` if omitted.',
    enum: ['similarity', 'influence', 'community', 'promising_node'],
    example: 'promising_node',
  })
  @IsOptional()
  @IsIn(['similarity', 'influence', 'community', 'promising_node'])
  strategy?: RankingStrategy;
}
