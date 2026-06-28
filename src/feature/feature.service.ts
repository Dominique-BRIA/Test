import { Injectable, Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { ProviderCategory } from '../shared/types';
import { REDIS_CLIENT } from '../config/redis.provider';

const CACHE_TTL = 300;

@Injectable()
export class FeatureService {
  private readonly providers: Map<string, { category: ProviderCategory; remoteUrl?: string }> =
    new Map();

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis | null) {}

  async registerProvider(
    name: string,
    category: ProviderCategory,
    remoteUrl?: string,
  ): Promise<void> {
    this.providers.set(name, { category, remoteUrl });
  }

  async compute(
    provider: string,
    sourceId: string,
    targetId: string,
  ): Promise<Record<string, number>> {
    const cacheKey = `features:${provider}:${sourceId}:${targetId}`;
    const cached = this.redis ? await this.redis.get(cacheKey) : null;
    if (cached !== null) return JSON.parse(cached!) as Record<string, number>;

    const config = this.providers.get(provider);
    if (!config?.remoteUrl) return {};

    const features = await this.fetchWithRetry(config.remoteUrl, sourceId, targetId, 1);
    if (this.redis) {
      await this.redis.set(cacheKey, JSON.stringify(features), 'EX', CACHE_TTL);
    }
    return features;
  }

  private async fetchWithRetry(
    url: string,
    sourceId: string,
    targetId: string,
    retries: number,
  ): Promise<Record<string, number>> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source: sourceId, target: targetId }),
        signal: controller.signal,
      });
      const json = (await response.json()) as { features?: Record<string, number> };
      return json.features ?? {};
    } catch {
      if (retries > 0) return this.fetchWithRetry(url, sourceId, targetId, retries - 1);
      return {};
    } finally {
      clearTimeout(timer);
    }
  }

  async composite(
    providers: string[],
    sourceId: string,
    targetId: string,
  ): Promise<Record<string, number>> {
    const maps = await Promise.all(providers.map((p) => this.compute(p, sourceId, targetId)));
    return maps.reduce<Record<string, number>>((acc, m) => ({ ...acc, ...m }), {});
  }

  async invalidateNode(nodeId: string): Promise<void> {
    if (!this.redis) return;
    const patterns = [`features:*:${nodeId}:*`, `features:*:*:${nodeId}`];
    for (const pattern of patterns) {
      let cursor = '0';
      do {
        const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
        cursor = nextCursor;
        if (keys.length > 0) {
          await this.redis.del(...keys);
        }
      } while (cursor !== '0');
    }
  }
}
