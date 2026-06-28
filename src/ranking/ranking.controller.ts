import { Controller, Post, Body, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiSecurity,
  ApiBody,
} from '@nestjs/swagger';
import { RankingService } from './ranking.service';
import { TopKDto } from './dto/top-k.dto';
import { ApiResponse, RankedCandidate } from '../shared/types';
import { ApiKeyGuard } from '../auth/api-key.guard';

@ApiTags('Ranking')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('ranking')
export class RankingController {
  constructor(private readonly rankingService: RankingService) {}

  @Post('top-k')
  @ApiOperation({
    summary: 'Top-K recommendations for a node',
    description:
      'The main recommendation endpoint. Runs the full two-stage pipeline:\n\n' +
      '### Stage 1 — Candidate Generation\n' +
      'Narrows the full node space (~100 000 nodes) to ~500 candidates using lightweight heuristics:\n' +
      '- Common neighbours\n' +
      '- Structural similarity (degree, PageRank)\n' +
      '- Domain-specific pre-filters\n\n' +
      '### Stage 2 — Ranking\n' +
      'Scores each candidate with the chosen strategy and returns the top K:\n\n' +
      '| Strategy | Formula | Best for |\n' +
      '|---|---|---|\n' +
      '| `similarity` | Cosine(embed_source, embed_target) | Pre-computed embeddings |\n' +
      '| `influence` | PageRank(target) × fitness(target) | Popularity-weighted results |\n' +
      '| `community` | +0.3 boost if same community label | Topic / social clusters |\n' +
      '| `promising_node` | 0.4×features + 0.3×pagerank + 0.3×fitness | **Default — balanced** |\n\n' +
      '```bash\n' +
      'curl -X POST http://localhost:3001/ranking/top-k \\\n' +
      '  -H "X-API-Key: $API_KEY" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      '  -d \'{"source":"student-uuid","relation":"enrolled_in","k":5,"strategy":"promising_node"}\'\n' +
      '```',
  })
  @ApiBody({ type: TopKDto })
  @SwaggerResponse({
    status: 201,
    description: 'Top-K ranked candidates.',
    schema: {
      example: {
        data: {
          results: [
            { id: 'course-uuid-1', score: 0.95, rank: 1 },
            { id: 'course-uuid-2', score: 0.88, rank: 2 },
            { id: 'course-uuid-3', score: 0.81, rank: 3 },
          ],
        },
      },
    },
  })
  @SwaggerResponse({ status: 401, description: 'Invalid API key.' })
  async topK(
    @Body() dto: TopKDto,
    @Req() req: Request & Record<string, unknown>,
  ): Promise<ApiResponse<{ results: RankedCandidate[] }>> {
    const workspaceId = String(req['workspaceId'] ?? '');
    const results = await this.rankingService.topK(
      dto.source,
      dto.relation,
      dto.k,
      dto.strategy,
      workspaceId,
    );
    return { data: { results } };
  }
}
