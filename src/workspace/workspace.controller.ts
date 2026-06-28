import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  Req,
  UseGuards,
  NotFoundException,
  HttpCode,
} from '@nestjs/common';
import { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiBearerAuth,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { WorkspaceService } from './workspace.service';
import { SessionGuard } from '../auth/session.guard';
import { CreateWorkspaceDto } from './dto/create-workspace.dto';
import { CreateApiKeyDto } from './dto/create-api-key.dto';
import { ApiResponse } from '../shared/types';

type AuthRequest = Request & Record<string, unknown>;

@ApiTags('Workspaces')
@ApiBearerAuth('session')
@UseGuards(SessionGuard)
@Controller('workspaces')
export class WorkspaceController {
  constructor(private readonly workspaceService: WorkspaceService) {}

  @Post()
  @ApiOperation({
    summary: 'Create a workspace',
    description:
      'Creates a new multi-tenant workspace with the specified domain adapter. ' +
      'The authenticated user becomes the owner. ' +
      'Each workspace has its own isolated graph, API keys, and usage metrics.\n\n' +
      '**Built-in domain adapters:** `education`, `renting`, `bookstore`, `manufacturing`\n\n' +
      'You can pass any custom string — only affects labelling in the dashboard.',
  })
  @ApiBody({ type: CreateWorkspaceDto })
  @SwaggerResponse({
    status: 201,
    description: 'Workspace created.',
    schema: {
      example: {
        data: {
          id: 'c0473e6e-a61e-4cea-a8b5-8bdeaae327cc',
          name: 'school-graph-prod',
          adapter_name: 'education',
          owner_id: 'user-uuid',
          created_at: '2026-06-17T09:00:00Z',
        },
      },
    },
  })
  @SwaggerResponse({ status: 401, description: 'Not authenticated.' })
  async create(
    @Body() dto: CreateWorkspaceDto,
    @Req() req: AuthRequest,
  ): Promise<ApiResponse<unknown>> {
    const ownerId = String(req['userId']);
    const data = await this.workspaceService.create(dto.name, dto.adapter_name, ownerId);
    return { data };
  }

  @Get()
  @ApiOperation({
    summary: 'List all workspaces for the current user',
    description: 'Returns all workspaces owned by the authenticated user, ordered by creation date.',
  })
  @SwaggerResponse({
    status: 200,
    description: 'Workspace list.',
    schema: {
      example: {
        data: [
          { id: 'c0473e6e...', name: 'school-graph-prod', adapter_name: 'education', created_at: '2026-06-17T09:00:00Z' },
        ],
      },
    },
  })
  async list(@Req() req: AuthRequest): Promise<ApiResponse<unknown>> {
    const data = await this.workspaceService.findByOwner(String(req['userId']));
    return { data };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a single workspace by ID' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @SwaggerResponse({ status: 200, description: 'Workspace object.' })
  @SwaggerResponse({ status: 404, description: 'Workspace not found or not owned by caller.' })
  async getOne(@Param('id') id: string, @Req() req: AuthRequest): Promise<ApiResponse<unknown>> {
    const ws = await this.workspaceService.findById(id, String(req['userId']));
    if (!ws) throw new NotFoundException('Workspace not found');
    return { data: ws };
  }

  @Get(':id/stats')
  @ApiOperation({
    summary: 'Usage statistics for a workspace',
    description:
      'Returns aggregated metrics: total request count, average latency, node/edge counts.',
  })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @SwaggerResponse({
    status: 200,
    description: 'Workspace statistics.',
    schema: {
      example: {
        data: {
          request_count: 1420,
          avg_latency_ms: 38,
          node_count: 250,
          edge_count: 1800,
        },
      },
    },
  })
  async getStats(@Param('id') id: string, @Req() req: AuthRequest): Promise<ApiResponse<unknown>> {
    const ws = await this.workspaceService.findById(id, String(req['userId']));
    if (!ws) throw new NotFoundException('Workspace not found');
    const data = await this.workspaceService.getStats(id);
    return { data };
  }

  @Get(':id/api-keys')
  @ApiOperation({
    summary: 'List API keys for a workspace',
    description:
      'Returns key metadata (id, name, created_at, last_used_at). ' +
      'The raw key value is only shown once at creation time.',
  })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @SwaggerResponse({
    status: 200,
    schema: {
      example: {
        data: [
          { id: 'key-uuid', name: 'production', created_at: '2026-06-17T09:00:00Z', last_used_at: '2026-06-17T10:22:00Z' },
        ],
      },
    },
  })
  async listApiKeys(
    @Param('id') id: string,
    @Req() req: AuthRequest,
  ): Promise<ApiResponse<unknown>> {
    const ws = await this.workspaceService.findById(id, String(req['userId']));
    if (!ws) throw new NotFoundException('Workspace not found');
    const data = await this.workspaceService.listApiKeys(id);
    return { data };
  }

  @Post(':id/api-keys')
  @ApiOperation({
    summary: 'Create a new API key',
    description:
      'Generates a new 256-bit API key (base64url). ' +
      'Only the SHA-256 hash is persisted — **copy the raw key now**, it cannot be recovered later. ' +
      'Pass it as `X-API-Key: <key>` on all machine API routes.',
  })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiBody({ type: CreateApiKeyDto })
  @SwaggerResponse({
    status: 201,
    schema: {
      example: { data: { key: 'yl_A3fB...256-bit-base64url-value...xZ' } },
    },
  })
  async createApiKey(
    @Param('id') id: string,
    @Body() dto: CreateApiKeyDto,
    @Req() req: AuthRequest,
  ): Promise<ApiResponse<{ key: string }>> {
    const ws = await this.workspaceService.findById(id, String(req['userId']));
    if (!ws) throw new NotFoundException('Workspace not found');
    const key = await this.workspaceService.createApiKey(id, dto.name);
    return { data: { key } };
  }

  @Delete(':id/api-keys/:keyId')
  @HttpCode(204)
  @ApiOperation({ summary: 'Revoke an API key', description: 'Permanently deletes the key. Any requests using it will immediately receive 401.' })
  @ApiParam({ name: 'id', description: 'Workspace UUID' })
  @ApiParam({ name: 'keyId', description: 'API key UUID' })
  @SwaggerResponse({ status: 204, description: 'Key revoked.' })
  @SwaggerResponse({ status: 404, description: 'Workspace or key not found.' })
  async revokeApiKey(
    @Param('id') id: string,
    @Param('keyId') keyId: string,
    @Req() req: AuthRequest,
  ): Promise<void> {
    const ws = await this.workspaceService.findById(id, String(req['userId']));
    if (!ws) throw new NotFoundException('Workspace not found');
    await this.workspaceService.revokeApiKey(id, keyId);
  }
}
