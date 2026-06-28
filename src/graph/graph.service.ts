import { Injectable, NotFoundException } from '@nestjs/common';
import { Inject } from '@nestjs/common';
import { Driver, Session } from 'neo4j-driver';
import { GraphNode, GraphEdge, WeightStrategy } from '../shared/types';
import { NEO4J_DRIVER } from '../config/neo4j.provider';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class GraphService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NEO4J_DRIVER) private readonly neo4j: Driver,
  ) {}

  async createNode(payload: Omit<GraphNode, 'created_at'>): Promise<GraphNode> {
    const { id, workspace_id, type, attributes } = payload;
    return this.prisma.node.upsert({
      where: { id },
      update: {},
      create: { id, workspace_id, type, attributes: (attributes ?? {}) as object },
    }) as unknown as Promise<GraphNode>;
  }

  async getNode(id: string): Promise<GraphNode | null> {
    return this.prisma.node.findUnique({ where: { id } }) as unknown as Promise<GraphNode | null>;
  }

  async getNodes(workspaceId?: string): Promise<GraphNode[]> {
    return this.prisma.node.findMany({
      where: workspaceId ? { workspace_id: workspaceId } : undefined,
      orderBy: { created_at: 'desc' },
    }) as unknown as Promise<GraphNode[]>;
  }

  async createEdge(payload: Omit<GraphEdge, 'id'>): Promise<GraphEdge> {
    const { workspace_id, source_id, target_id, type, event_time } = payload;
    const strategy: WeightStrategy = payload.weight_strategy ?? 'explicit';

    const count = await this.prisma.node.count({
      where: { id: { in: [source_id, target_id] } },
    });
    if (count < 2) throw new NotFoundException('Source or target node not found');

    const resolvedWeight = await this.resolveWeight(
      strategy,
      payload.weight,
      workspace_id,
      source_id,
      target_id,
    );

    return this.prisma.edge.create({
      data: {
        workspace_id,
        source_id,
        target_id,
        type,
        weight: resolvedWeight,
        weight_strategy: strategy,
        event_time: event_time ?? new Date(),
      },
    }) as unknown as Promise<GraphEdge>;
  }

  async getEdge(id: string): Promise<GraphEdge | null> {
    return this.prisma.edge.findUnique({ where: { id } }) as unknown as Promise<GraphEdge | null>;
  }

  async getEdges(filter?: {
    sourceId?: string;
    targetId?: string;
    workspaceId?: string;
  }): Promise<GraphEdge[]> {
    return this.prisma.edge.findMany({
      where: {
        ...(filter?.workspaceId && { workspace_id: filter.workspaceId }),
        ...(filter?.sourceId && { source_id: filter.sourceId }),
        ...(filter?.targetId && { target_id: filter.targetId }),
      },
      orderBy: { event_time: 'desc' },
    }) as unknown as Promise<GraphEdge[]>;
  }

  async querySubgraph(
    rootNode: string,
    depth: number,
    relationTypes: string[],
    nodeTypes?: string[],
  ): Promise<string[]> {
    const session: Session = this.neo4j.session();
    try {
      const result = await session.run(
        `MATCH (u)-[r*1..${depth}]-(n)
         WHERE u.id = $rootNode
         AND ALL(rel IN r WHERE type(rel) IN $relationTypes)
         AND ($nodeTypes IS NULL OR n.type IN $nodeTypes)
         RETURN DISTINCT n.id AS nodeId`,
        { rootNode, relationTypes, nodeTypes: nodeTypes ?? null },
      );
      return result.records.map((rec) => String(rec.get('nodeId')));
    } finally {
      await session.close();
    }
  }

  async getNodeDegree(nodeId: string): Promise<{ in: number; out: number }> {
    const [inCount, outCount] = await Promise.all([
      this.prisma.edge.count({ where: { target_id: nodeId } }),
      this.prisma.edge.count({ where: { source_id: nodeId } }),
    ]);
    return { in: inCount, out: outCount };
  }

  private async resolveWeight(
    strategy: WeightStrategy,
    explicitWeight: number | undefined,
    workspaceId: string,
    sourceId: string,
    targetId: string,
  ): Promise<number> {
    if (strategy === 'explicit' || strategy === 'temporal') {
      return explicitWeight ?? 1.0;
    }

    const existingLinks = await this.prisma.edge.count({
      where: {
        workspace_id: workspaceId,
        OR: [
          { source_id: sourceId, target_id: targetId },
          { source_id: targetId, target_id: sourceId },
        ],
      },
    });
    return Math.min(2.0, 1.0 + existingLinks * 0.2);
  }
}
