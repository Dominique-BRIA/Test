import { Injectable, Inject } from '@nestjs/common';
import { Driver } from 'neo4j-driver';
import { NEO4J_DRIVER } from '../config/neo4j.provider';
import { PrismaService } from '../prisma/prisma.service';
import { IDomainAdapter } from '../shared/interfaces';
import { RankingStrategy } from '../shared/types';

@Injectable()
export class RepresentationService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NEO4J_DRIVER) private readonly neo4j: Driver,
  ) {}

  vectorize(attributes: Record<string, unknown>): number[] {
    return Object.values(attributes).filter((v): v is number => typeof v === 'number');
  }

  async store(
    nodeId: string,
    provider: string,
    vector: number[],
    workspaceId: string,
    version = 1,
  ): Promise<void> {
    await this.prisma.nodeEmbedding.create({
      data: { node_id: nodeId, provider, vector, dimension: vector.length, workspace_id: workspaceId, version },
    });
  }

  async retrieve(nodeId: string, provider: string): Promise<number[] | null> {
    const row = await this.prisma.nodeEmbedding.findFirst({
      where: { node_id: nodeId, provider },
      orderBy: { version: 'desc' },
      select: { vector: true },
    });
    return row ? (row.vector as number[]) : null;
  }

  async computeEmbedding(
    nodeId: string,
    provider: string,
    remoteUrl: string,
    workspaceId: string,
  ): Promise<number[]> {
    const node = await this.prisma.node.findUnique({
      where: { id: nodeId },
      select: { attributes: true },
    });
    const attributes = (node?.attributes ?? {}) as Record<string, unknown>;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(remoteUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeId, attributes }),
        signal: controller.signal,
      });
      const json = (await response.json()) as { vector?: number[] };
      const vector = Array.isArray(json.vector) ? json.vector : this.vectorize(attributes);
      await this.store(nodeId, provider, vector, workspaceId);
      return vector;
    } catch {
      const vector = this.vectorize(attributes);
      await this.store(nodeId, provider, vector, workspaceId);
      return vector;
    } finally {
      clearTimeout(timer);
    }
  }

  deduceStrategy(
    adapter: IDomainAdapter,
    sampleAttributes: Record<string, unknown> = {},
  ): RankingStrategy {
    const topology = adapter.networkTopology;

    if (topology === 'social') return 'community';
    if (topology === 'flow' || topology === 'hierarchical') return 'influence';

    const values = Object.values(sampleAttributes);
    const numericCount = values.filter((v) => typeof v === 'number').length;
    const textCount = values.filter((v) => typeof v === 'string').length;

    if (textCount > numericCount) return 'similarity';
    if (numericCount > textCount) return 'influence';

    return 'promising_node';
  }
}
