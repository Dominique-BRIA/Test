import { Controller, Post, Get, Body, Param, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiSecurity,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PredictionService } from './prediction.service';
import { PredictLinkDto } from './dto/predict-link.dto';
import { RankDto } from './dto/rank.dto';
import { ExplainDto } from './dto/explain.dto';
import { RunPipelineDto } from './dto/run-pipeline.dto';
import { ApiResponse, PredictionJob } from '../shared/types';
import { ApiKeyGuard } from '../auth/api-key.guard';

@ApiTags('Prediction')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('prediction')
export class PredictionController {
  constructor(private readonly predictionService: PredictionService) {}

  @Post('link')
  @ApiOperation({
    summary: 'Predict link probability for a single pair',
    description:
      'Runs the full Recommendation Engine pipeline for one (source, target) pair:\n\n' +
      '1. **Feature extraction** — all registered providers compute individual scores\n' +
      '2. **Aggregation** — scores are combined (default: mean)\n' +
      '3. **Output** — a single probability in [0, 1]\n\n' +
      '```bash\n' +
      'curl -X POST http://localhost:3001/prediction/link \\\n' +
      '  -H "X-API-Key: $API_KEY" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      '  -d \'{"source":"student-uuid","target":"course-uuid","relation_type":"enrolled_in"}\'\n' +
      '# → { "data": { "score": 0.843 } }\n' +
      '```',
  })
  @ApiBody({ type: PredictLinkDto })
  @SwaggerResponse({
    status: 201,
    description: 'Prediction score.',
    schema: { example: { data: { score: 0.843 } } },
  })
  @SwaggerResponse({ status: 401, description: 'Invalid API key.' })
  async predictLink(@Body() dto: PredictLinkDto): Promise<ApiResponse<{ score: number }>> {
    const score = await this.predictionService.predictLink(
      dto.source,
      dto.target,
      dto.relation_type,
    );
    return { data: { score } };
  }

  @Post('rank')
  @ApiOperation({
    summary: 'Score and sort a list of candidates',
    description:
      'Calls `predictLink` for each candidate and returns the list sorted by descending score.\n\n' +
      '```bash\n' +
      'curl -X POST http://localhost:3001/prediction/rank \\\n' +
      '  -H "X-API-Key: $API_KEY" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      '  -d \'{"source":"student-uuid","candidates":["course-1","course-2","course-3"]}\'\n' +
      '```\n\n' +
      '> **Tip:** For large candidate sets use `/ranking/top-k` instead — it uses the ' +
      'CandidateGenerator to pre-filter 100 000 nodes down to ~500 before ranking.',
  })
  @ApiBody({ type: RankDto })
  @SwaggerResponse({
    status: 201,
    schema: {
      example: {
        data: [
          { id: 'course-1', score: 0.91 },
          { id: 'course-3', score: 0.78 },
          { id: 'course-2', score: 0.55 },
        ],
      },
    },
  })
  async rank(
    @Body() dto: RankDto,
  ): Promise<ApiResponse<{ id: string; score: number }[]>> {
    const data = await this.predictionService.rank(dto.source, dto.candidates);
    return { data };
  }

  @Post('explain')
  @ApiOperation({
    summary: 'Explain a prediction',
    description:
      'Returns the top contributing features (by SHAP-style marginal importance) for a given pair. ' +
      'Useful for surfacing "why was X recommended to Y?" in your UI.\n\n' +
      '```bash\n' +
      'curl -X POST http://localhost:3001/prediction/explain \\\n' +
      '  -H "X-API-Key: $API_KEY" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      '  -d \'{"source":"student-uuid","target":"course-uuid"}\'\n' +
      '```',
  })
  @ApiBody({ type: ExplainDto })
  @SwaggerResponse({
    status: 201,
    schema: {
      example: {
        data: {
          top_features: ['skill_overlap', 'community_overlap', 'level_match'],
        },
      },
    },
  })
  async explain(
    @Body() dto: ExplainDto,
  ): Promise<ApiResponse<{ top_features: string[] }>> {
    const data = await this.predictionService.explain(dto.source, dto.target);
    return { data };
  }

  @Post('jobs')
  @ApiOperation({
    summary: 'Submit an async prediction pipeline job',
    description:
      'Enqueues a pipeline job on Kafka. Returns immediately with a `jobId`. ' +
      'Poll `GET /prediction/jobs/:id` to check status.\n\n' +
      '**Pipeline config:**\n' +
      '```json\n' +
      '{\n' +
      '  "sourceId": "student-uuid",\n' +
      '  "targetId": "course-uuid",\n' +
      '  "workspaceId": "ws-uuid",\n' +
      '  "config": {\n' +
      '    "features": ["community_overlap", "feature_score"],\n' +
      '    "model": "weighted_sum",\n' +
      '    "weights": { "community_overlap": 0.6, "feature_score": 0.4 }\n' +
      '  }\n' +
      '}\n' +
      '```',
  })
  @ApiBody({ type: RunPipelineDto })
  @SwaggerResponse({
    status: 201,
    schema: {
      example: {
        data: {
          id: 'job-uuid',
          status: 'pending',
          sourceId: 'student-uuid',
          targetId: 'course-uuid',
          createdAt: '2026-06-17T09:00:00Z',
        },
      },
    },
  })
  async createJob(@Body() dto: RunPipelineDto): Promise<ApiResponse<PredictionJob>> {
    const data = await this.predictionService.createJob(
      dto.sourceId,
      dto.targetId,
      dto.config,
      dto.workspaceId,
    );
    return { data };
  }

  @Get('jobs/:id')
  @ApiOperation({ summary: 'Poll async pipeline job status' })
  @ApiParam({ name: 'id', description: 'Job UUID returned by POST /prediction/jobs' })
  @SwaggerResponse({
    status: 200,
    schema: {
      example: {
        data: {
          id: 'job-uuid',
          status: 'completed',
          result: { score: 0.87 },
          completedAt: '2026-06-17T09:00:05Z',
        },
      },
    },
  })
  async getJob(@Param('id') id: string): Promise<ApiResponse<PredictionJob | null>> {
    const data = await this.predictionService.getJob(id);
    return { data };
  }
}
