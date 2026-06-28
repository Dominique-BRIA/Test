import { Injectable, Inject } from '@nestjs/common';
import { Driver } from 'neo4j-driver';
import { NEO4J_DRIVER } from '../config/neo4j.provider';
import { PrismaService } from '../prisma/prisma.service';
import { cosineSimilarity } from '../shared/algorithms';

@Injectable()
export class CandidateGeneratorService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(NEO4J_DRIVER) private readonly neo4j: Driver,
  ) {}

  async fromNeighborhood(sourceId: string, limit = 500): Promise<string[]> {
    const session = this.neo4j.session();
    try {
      const result = await session.run(
        `MATCH (u {id: $sourceId})-[*1..2]-(n)
         WHERE n.id <> $sourceId
         RETURN DISTINCT n.id AS id LIMIT 500`,
        { sourceId },
      );
      return result.records
        .map((r) => String(r.get('id') as string))
        .slice(0, limit);
    } finally {
      await session.close();
    }
  }

  async fromEmbeddings(
    sourceId: string,
    workspaceId: string,
    provider = 'default',
    limit = 500,
  ): Promise<string[]> {
    const rows = await this.prisma.nodeEmbedding.findMany({
      where: { workspace_id: workspaceId, provider },
      select: { node_id: true, vector: true },
    });
    const sourceRow = rows.find((r) => r.node_id === sourceId);
    if (!sourceRow) return [];

    const sourceVector = sourceRow.vector as number[];
    return rows
      .filter((r) => r.node_id !== sourceId)
      .map((r) => ({ id: r.node_id, sim: cosineSimilarity(sourceVector, r.vector as number[]) }))
      .sort((a, b) => b.sim - a.sim)
      .slice(0, limit)
      .map((r) => r.id);
  }

  async generate(sourceId: string, workspaceId: string, limit = 500): Promise<string[]> {
    const neighbors = await this.fromNeighborhood(sourceId, limit).catch(() => [] as string[]);

    if (neighbors.length >= Math.min(50, limit)) {
      return neighbors.slice(0, limit);
    }

    const dbNodes = await this.prisma.node.findMany({
      where: { workspace_id: workspaceId, NOT: { id: sourceId } },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: { id: true },
    });

    return [...new Set([...neighbors, ...dbNodes.map((n) => n.id)])].slice(0, limit);
  }
}
