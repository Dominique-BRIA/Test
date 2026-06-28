import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiSecurity,
  ApiBody,
} from '@nestjs/swagger';
import { FeatureService } from './feature.service';
import { RegisterProviderDto } from './dto/register-provider.dto';
import { ComputeDto } from './dto/compute.dto';
import { CompositeDto } from './dto/composite.dto';
import { ApiResponse } from '../shared/types';
import { ApiKeyGuard } from '../auth/api-key.guard';

@ApiTags('Features')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('features')
export class FeatureController {
  constructor(private readonly featureService: FeatureService) {}

  @Post('providers')
  @ApiOperation({
    summary: 'Register a scoring provider',
    description:
      'Adds a named provider to the feature registry. ' +
      'Providers implement `RecommendationProvider.score(source, target, context): Promise<number>` ' +
      'and return a value in **[0, 1]**.\n\n' +
      '**Built-in providers:**\n\n' +
      '| Name | Category | What it measures |\n' +
      '|---|---|---|\n' +
      '| `community_overlap` | graph | Jaccard similarity of neighbour sets |\n' +
      '| `feature_score` | attribute | Dot-product of normalised attribute vectors |\n' +
      '| `location_score` | attribute | Inverse geodesic distance (renting domain) |\n' +
      '| `availability_score` | attribute | Overlap of availability windows |\n' +
      '| `trust_score` | attribute | Aggregated review/rating signal |\n\n' +
      'Register `external` providers to point at your own HTTP microservice.',
  })
  @ApiBody({ type: RegisterProviderDto })
  @SwaggerResponse({ status: 201, description: 'Provider registered.' })
  @SwaggerResponse({ status: 400, description: 'Validation error.' })
  async registerProvider(@Body() dto: RegisterProviderDto): Promise<ApiResponse<null>> {
    await this.featureService.registerProvider(dto.name, dto.category, dto.remoteUrl);
    return { data: null };
  }

  @Post('compute')
  @ApiOperation({
    summary: 'Compute a single feature score',
    description:
      'Invokes one registered provider and returns a score in [0, 1]. ' +
      'Results are cached in Redis for 60 seconds (keyed by `provider:source:target`).\n\n' +
      '```bash\n' +
      'curl -X POST http://localhost:3001/features/compute \\\n' +
      '  -H "X-API-Key: $API_KEY" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      '  -d \'{"provider":"community_overlap","source":"node-1","target":"node-2"}\'\n' +
      '```',
  })
  @ApiBody({ type: ComputeDto })
  @SwaggerResponse({
    status: 201,
    schema: { example: { data: { features: { community_overlap: 0.72 } } } },
  })
  async compute(
    @Body() dto: ComputeDto,
  ): Promise<ApiResponse<{ features: Record<string, number> }>> {
    const features = await this.featureService.compute(dto.provider, dto.source, dto.target);
    return { data: { features } };
  }

  @Post('composite')
  @ApiOperation({
    summary: 'Compute multiple features in one call',
    description:
      'Runs all listed providers in parallel and merges results into a single score map. ' +
      'Use this to build the feature vector that the Recommendation Engine will aggregate.\n\n' +
      '```bash\n' +
      'curl -X POST http://localhost:3001/features/composite \\\n' +
      '  -H "X-API-Key: $API_KEY" \\\n' +
      '  -H "Content-Type: application/json" \\\n' +
      '  -d \'{"providers":["community_overlap","feature_score"],"source":"node-1","target":"node-2"}\'\n' +
      '```',
  })
  @ApiBody({ type: CompositeDto })
  @SwaggerResponse({
    status: 201,
    schema: {
      example: {
        data: {
          features: {
            community_overlap: 0.72,
            feature_score: 0.88,
          },
        },
      },
    },
  })
  async composite(
    @Body() dto: CompositeDto,
  ): Promise<ApiResponse<{ features: Record<string, number> }>> {
    const features = await this.featureService.composite(dto.providers, dto.source, dto.target);
    return { data: { features } };
  }
}
