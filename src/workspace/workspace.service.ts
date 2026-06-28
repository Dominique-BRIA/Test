import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';

export interface WorkspaceRow {
  id: string;
  name: string;
  description?: string | null;
  adapter_name: string;
  adapter_version: string;
  owner_id?: string | null;
  created_at?: Date | string;
}

export interface WorkspaceStats {
  node_count: number;
  edge_count: number;
  prediction_jobs: number;
  request_count: number;
  avg_latency_ms: number;
}

export interface ApiKeyInfo {
  id: string;
  name: string;
  created_at: string;
  last_used_at?: string;
  revoked: boolean;
}

@Injectable()
export class WorkspaceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async create(name: string, adapterName: string, ownerId: string): Promise<WorkspaceRow> {
    return this.prisma.workspace.create({
      data: { name, adapter_name: adapterName, adapter_version: '1.0', owner_id: ownerId },
    }) as unknown as Promise<WorkspaceRow>;
  }

  async findByOwner(ownerId: string): Promise<WorkspaceRow[]> {
    return this.prisma.workspace.findMany({
      where: { owner_id: ownerId },
      orderBy: { created_at: 'desc' },
    }) as unknown as Promise<WorkspaceRow[]>;
  }

  async findById(id: string, ownerId: string): Promise<WorkspaceRow | null> {
    return this.prisma.workspace.findFirst({
      where: { id, owner_id: ownerId },
    }) as unknown as Promise<WorkspaceRow | null>;
  }

  async getStats(id: string): Promise<WorkspaceStats> {
    const [nodeCount, edgeCount, jobCount, requestCount, latencyAgg] = await Promise.all([
      this.prisma.node.count({ where: { workspace_id: id } }),
      this.prisma.edge.count({ where: { workspace_id: id } }),
      this.prisma.predictionJob.count({ where: { workspace_id: id } }),
      this.prisma.usageLog.count({ where: { workspace_id: id } }),
      this.prisma.usageLog.aggregate({
        where: { workspace_id: id },
        _avg: { latency_ms: true },
      }),
    ]);
    return {
      node_count: nodeCount,
      edge_count: edgeCount,
      prediction_jobs: jobCount,
      request_count: requestCount,
      avg_latency_ms: Math.round(latencyAgg._avg.latency_ms ?? 0),
    };
  }

  async listApiKeys(workspaceId: string): Promise<ApiKeyInfo[]> {
    const keys = await this.prisma.apiKey.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' },
      select: { id: true, name: true, created_at: true, last_used_at: true, revoked: true },
    });
    return keys.map((k) => ({
      id: k.id,
      name: k.name,
      created_at: k.created_at.toISOString(),
      last_used_at: k.last_used_at?.toISOString(),
      revoked: k.revoked,
    }));
  }

  async createApiKey(workspaceId: string, name: string): Promise<string> {
    return this.authService.generateKey(workspaceId, name);
  }

  async revokeApiKey(workspaceId: string, keyId: string): Promise<void> {
    await this.prisma.apiKey.updateMany({
      where: { id: keyId, workspace_id: workspaceId },
      data: { revoked: true },
    });
  }
}
