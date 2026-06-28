import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsageService, UsageLog, UsageStats } from './usage.service';
import { SessionGuard } from '../auth/session.guard';
import { ApiResponse } from '../shared/types';

@ApiTags('Usage')
@ApiBearerAuth('session')
@UseGuards(SessionGuard)
@Controller('usage')
export class UsageController {
  constructor(private readonly usageService: UsageService) {}

  @Get('logs')
  @ApiOperation({
    summary: 'Recent API request logs',
    description:
      'Returns the most recent request logs for a workspace. ' +
      'Each log entry includes the endpoint, latency, status code, and timestamp. ' +
      'Logged automatically by the global `UsageLoggerInterceptor` after every API-key-authenticated request.',
  })
  @ApiQuery({ name: 'workspace_id', description: 'Workspace UUID to fetch logs for.' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max rows to return (default 50).' })
  @SwaggerResponse({
    status: 200,
    schema: {
      example: {
        data: [
          {
            id: 'log-uuid',
            workspace_id: 'ws-uuid',
            endpoint: 'POST /ranking/top-k',
            status_code: 200,
            latency_ms: 42,
            created_at: '2026-06-17T10:22:00Z',
          },
        ],
      },
    },
  })
  async getLogs(
    @Query('workspace_id') workspaceId: string,
    @Query('limit') limit?: string,
  ): Promise<ApiResponse<UsageLog[]>> {
    const data = await this.usageService.getLogs(
      workspaceId,
      limit ? parseInt(limit, 10) : 50,
    );
    return { data };
  }

  @Get('stats')
  @ApiOperation({
    summary: 'Aggregated usage statistics',
    description:
      'Returns rolled-up metrics for a workspace: total request count, average latency, ' +
      'and per-endpoint breakdowns.',
  })
  @ApiQuery({ name: 'workspace_id', description: 'Workspace UUID.' })
  @SwaggerResponse({
    status: 200,
    schema: {
      example: {
        data: {
          request_count: 14200,
          avg_latency_ms: 38,
          by_endpoint: {
            'POST /ranking/top-k': { count: 8100, avg_latency_ms: 41 },
            'POST /prediction/link': { count: 3400, avg_latency_ms: 29 },
            'POST /graph/nodes': { count: 2700, avg_latency_ms: 18 },
          },
        },
      },
    },
  })
  async getStats(
    @Query('workspace_id') workspaceId: string,
  ): Promise<ApiResponse<UsageStats>> {
    const data = await this.usageService.getStats(workspaceId);
    return { data };
  }
}
