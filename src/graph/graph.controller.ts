import { Controller, Post, Get, Body, Param, Query, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse as SwaggerResponse,
  ApiSecurity,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { GraphService } from './graph.service';
import { CreateNodeDto } from './dto/create-node.dto';
import { CreateEdgeDto } from './dto/create-edge.dto';
import { QuerySubgraphDto } from './dto/query-subgraph.dto';
import { ApiResponse, GraphNode, GraphEdge } from '../shared/types';
import { ApiKeyGuard } from '../auth/api-key.guard';

@ApiTags('Graph')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Post('nodes')
  @ApiOperation({
    summary: 'Create or upsert a node',
    description:
      'Inserts a node into PostgreSQL and replicates it to Neo4j via Kafka. ' +
      'If a node with the same `id` already exists it is updated.\n\n' +
      '**Example (education domain):**\n' +
      '```json\n' +
      '{\n' +
      '  "id": "550e8400-e29b-41d4-a716-446655440001",\n' +
      '  "workspace_id": "c0473e6e-a61e-4cea-a8b5-8bdeaae327cc",\n' +
      '  "type": "student",\n' +
      '  "attributes": { "name": "Alice Dupont", "level": "MSc", "skills": ["Python", "ML"] }\n' +
      '}\n' +
      '```',
  })
  @ApiBody({ type: CreateNodeDto })
  @SwaggerResponse({
    status: 201,
    description: 'Node created/updated.',
    schema: {
      example: {
        data: {
          id: '550e8400-e29b-41d4-a716-446655440001',
          workspace_id: 'c0473e6e-a61e-4cea-a8b5-8bdeaae327cc',
          type: 'student',
          attributes: { name: 'Alice Dupont', level: 'MSc' },
          created_at: '2026-06-17T09:00:00Z',
        },
      },
    },
  })
  @SwaggerResponse({ status: 401, description: 'Missing or invalid API key.' })
  async createNode(@Body() dto: CreateNodeDto): Promise<ApiResponse<GraphNode>> {
    const data = await this.graphService.createNode({
      ...dto,
      attributes: dto.attributes ?? {},
    });
    return { data };
  }

  @Get('nodes')
  @ApiOperation({
    summary: 'List nodes',
    description: 'Returns all nodes in a workspace, or all nodes across workspaces if `workspaceId` is omitted.',
  })
  @ApiQuery({ name: 'workspaceId', required: false, description: 'Filter by workspace UUID.' })
  @SwaggerResponse({ status: 200, description: 'Node list.' })
  async getNodes(
    @Query('workspaceId') workspaceId?: string,
  ): Promise<ApiResponse<GraphNode[]>> {
    const data = await this.graphService.getNodes(workspaceId);
    return { data };
  }

  @Get('nodes/:id/degree')
  @ApiOperation({
    summary: 'Get in/out degree of a node',
    description: 'Returns the number of incoming and outgoing edges for the node in Neo4j.',
  })
  @ApiParam({ name: 'id', description: 'Node UUID' })
  @SwaggerResponse({
    status: 200,
    schema: { example: { data: { in: 12, out: 5 } } },
  })
  async getNodeDegree(
    @Param('id') id: string,
  ): Promise<ApiResponse<{ in: number; out: number }>> {
    const data = await this.graphService.getNodeDegree(id);
    return { data };
  }

  @Get('nodes/:id')
  @ApiOperation({ summary: 'Get a node by ID' })
  @ApiParam({ name: 'id', description: 'Node UUID' })
  @SwaggerResponse({ status: 200, description: 'Node object or null.' })
  async getNode(@Param('id') id: string): Promise<ApiResponse<GraphNode | null>> {
    const data = await this.graphService.getNode(id);
    return { data };
  }

  @Post('edges')
  @ApiOperation({
    summary: 'Create an edge',
    description:
      'Records a directed relationship between two nodes. ' +
      'Also replicates to Neo4j for graph traversal.\n\n' +
      '**Example (education domain):**\n' +
      '```json\n' +
      '{\n' +
      '  "workspace_id": "c0473e6e-a61e-4cea-a8b5-8bdeaae327cc",\n' +
      '  "source_id": "550e8400-e29b-41d4-a716-446655440001",\n' +
      '  "target_id": "550e8400-e29b-41d4-a716-446655440010",\n' +
      '  "type": "enrolled_in",\n' +
      '  "weight": 1.0,\n' +
      '  "timestamp": "2026-09-01T08:00:00Z"\n' +
      '}\n' +
      '```',
  })
  @ApiBody({ type: CreateEdgeDto })
  @SwaggerResponse({
    status: 201,
    schema: {
      example: {
        data: {
          id: 'edge-uuid',
          workspace_id: 'ws-uuid',
          source_id: 'node-uuid-1',
          target_id: 'node-uuid-2',
          type: 'enrolled_in',
          weight: 1.0,
          event_time: '2026-09-01T08:00:00Z',
        },
      },
    },
  })
  async createEdge(@Body() dto: CreateEdgeDto): Promise<ApiResponse<GraphEdge>> {
    const data = await this.graphService.createEdge({
      workspace_id: dto.workspace_id,
      source_id: dto.source_id,
      target_id: dto.target_id,
      type: dto.type,
      weight: dto.weight ?? 1.0,
      event_time: dto.timestamp,
    });
    return { data };
  }

  @Get('edges')
  @ApiOperation({ summary: 'List edges', description: 'Filter by workspace, source node, or target node.' })
  @ApiQuery({ name: 'workspaceId', required: false })
  @ApiQuery({ name: 'sourceId', required: false })
  @ApiQuery({ name: 'targetId', required: false })
  @SwaggerResponse({ status: 200, description: 'Edge list.' })
  async getEdges(
    @Query('workspaceId') workspaceId?: string,
    @Query('sourceId') sourceId?: string,
    @Query('targetId') targetId?: string,
  ): Promise<ApiResponse<GraphEdge[]>> {
    const data = await this.graphService.getEdges({ workspaceId, sourceId, targetId });
    return { data };
  }

  @Get('edges/:id')
  @ApiOperation({ summary: 'Get an edge by ID' })
  @ApiParam({ name: 'id', description: 'Edge UUID' })
  @SwaggerResponse({ status: 200, description: 'Edge object or null.' })
  async getEdge(@Param('id') id: string): Promise<ApiResponse<GraphEdge | null>> {
    const data = await this.graphService.getEdge(id);
    return { data };
  }

  @Post('query')
  @ApiOperation({
    summary: 'BFS subgraph traversal',
    description:
      'Performs a breadth-first traversal from `rootNode` in Neo4j up to `depth` hops, ' +
      'filtering by relationship type and optionally by node type. ' +
      'Returns the UUIDs of all reachable nodes.\n\n' +
      '**Example — find all courses within 2 hops of a student:**\n' +
      '```json\n' +
      '{\n' +
      '  "rootNode": "550e8400-e29b-41d4-a716-446655440001",\n' +
      '  "depth": 2,\n' +
      '  "relationTypes": ["enrolled_in", "mentors"],\n' +
      '  "nodeTypes": ["course"]\n' +
      '}\n' +
      '```',
  })
  @ApiBody({ type: QuerySubgraphDto })
  @SwaggerResponse({
    status: 200,
    schema: {
      example: {
        data: [
          '550e8400-e29b-41d4-a716-446655440010',
          '550e8400-e29b-41d4-a716-446655440011',
        ],
      },
    },
  })
  async querySubgraph(@Body() dto: QuerySubgraphDto): Promise<ApiResponse<string[]>> {
    const data = await this.graphService.querySubgraph(
      dto.rootNode,
      dto.depth,
      dto.relationTypes,
      dto.nodeTypes,
    );
    return { data };
  }
}
