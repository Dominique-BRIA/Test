import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface UsageLog {
  id: string;
  endpoint: string;
  method: string;
  status_code?: number;
  latency_ms?: number;
  created_at: string;
}

export interface UsageStats {
  total_requests: number;
  success_rate: number;
  avg_latency_ms: number;
  top_endpoints: { endpoint: string; count: number }[];
}

@Injectable()
export class UsageService {
  constructor(private readonly prisma: PrismaService) {}

  async getLogs(workspaceId: string, limit = 50): Promise<UsageLog[]> {
    const logs = await this.prisma.usageLog.findMany({
      where: { workspace_id: workspaceId },
      orderBy: { created_at: 'desc' },
      take: limit,
      select: { id: true, endpoint: true, method: true, status_code: true, latency_ms: true, created_at: true },
    });
    return logs.map((l) => ({
      id: l.id,
      endpoint: l.endpoint,
      method: l.method,
      status_code: l.status_code ?? undefined,
      latency_ms: l.latency_ms ?? undefined,
      created_at: l.created_at.toISOString(),
    }));
  }

  async getStats(workspaceId: string): Promise<UsageStats> {
    const [totalCount, successCount, latencyAgg, topEndpoints] = await Promise.all([
      this.prisma.usageLog.count({ where: { workspace_id: workspaceId } }),
      this.prisma.usageLog.count({
        where: { workspace_id: workspaceId, status_code: { lt: 400 } },
      }),
      this.prisma.usageLog.aggregate({
        where: { workspace_id: workspaceId },
        _avg: { latency_ms: true },
      }),
      this.prisma.usageLog.groupBy({
        by: ['endpoint'],
        where: { workspace_id: workspaceId },
        _count: { endpoint: true },
        orderBy: { _count: { endpoint: 'desc' } },
        take: 5,
      }),
    ]);

    return {
      total_requests: totalCount,
      success_rate: totalCount > 0 ? successCount / totalCount : 1,
      avg_latency_ms: Math.round(latencyAgg._avg.latency_ms ?? 0),
      top_endpoints: topEndpoints.map((r) => ({
        endpoint: r.endpoint,
        count: r._count.endpoint,
      })),
    };
  }
}
