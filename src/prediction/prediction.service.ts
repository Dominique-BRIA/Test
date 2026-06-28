import { Injectable, NotFoundException } from '@nestjs/common';
import { FeatureService } from '../feature/feature.service';
import { GraphService } from '../graph/graph.service';
import { PipelineConfig, PredictionJob } from '../shared/types';
import { PrismaService } from '../prisma/prisma.service';

const DEFAULT_PIPELINE: PipelineConfig = {
  features: ['community_overlap', 'feature_score'],
  model: 'mean',
};

@Injectable()
export class PredictionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly featureService: FeatureService,
    private readonly graphService: GraphService,
  ) {}

  async predictLink(
    sourceId: string,
    targetId: string,
    _relationType: string,
    config: PipelineConfig = DEFAULT_PIPELINE,
  ): Promise<number> {
    const source = await this.graphService.getNode(sourceId);
    if (!source) throw new NotFoundException(`Node '${sourceId}' not found`);
    const result = await this.computePipeline(sourceId, targetId, config);
    return result._score;
  }

  async rank(
    sourceId: string,
    candidates: string[],
    config: PipelineConfig = DEFAULT_PIPELINE,
  ): Promise<{ id: string; score: number }[]> {
    const results = await Promise.all(
      candidates.map(async (id) => ({
        id,
        score: (await this.computePipeline(sourceId, id, config))._score,
      })),
    );
    return results.sort((a, b) => b.score - a.score);
  }

  async explain(sourceId: string, targetId: string): Promise<{ top_features: string[] }> {
    const features = await this.featureService.composite(
      DEFAULT_PIPELINE.features,
      sourceId,
      targetId,
    );
    const sorted = Object.entries(features)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key]) => key);
    return { top_features: sorted };
  }

  async createJob(
    sourceId: string,
    targetId: string,
    config: PipelineConfig,
    workspaceId: string,
  ): Promise<PredictionJob> {
    const job = await this.prisma.predictionJob.create({
      data: { workspace_id: workspaceId, source_id: sourceId, target_id: targetId, pipeline_config: config as object, status: 'pending' },
    });

    Promise.resolve()
      .then(async () => {
        await this.prisma.predictionJob.update({ where: { id: job.id }, data: { status: 'running' } });
        const jobResult = await this.computePipeline(sourceId, targetId, config);
        await this.prisma.predictionJob.update({
          where: { id: job.id },
          data: { status: 'completed', result: jobResult as object, completed_at: new Date() },
        });
      })
      .catch(async (err: unknown) => {
        await this.prisma.predictionJob.update({
          where: { id: job.id },
          data: { status: 'failed', error: String(err), completed_at: new Date() },
        });
      });

    return job as unknown as PredictionJob;
  }

  async getJob(jobId: string): Promise<PredictionJob | null> {
    return this.prisma.predictionJob.findUnique({ where: { id: jobId } }) as Promise<PredictionJob | null>;
  }

  private async computePipeline(
    sourceId: string,
    targetId: string,
    config: PipelineConfig,
  ): Promise<Record<string, number> & { _score: number }> {
    const featureMaps = await Promise.all(
      config.features.map((p) => this.featureService.compute(p, sourceId, targetId)),
    );
    const merged = featureMaps.reduce<Record<string, number>>((acc, m) => ({ ...acc, ...m }), {});
    return { ...merged, _score: this.applyModel(merged, config) };
  }

  private applyModel(features: Record<string, number>, config: PipelineConfig): number {
    const entries = Object.entries(features).filter(([k]) => !k.startsWith('_'));
    if (entries.length === 0) return 0;

    if (config.model === 'weighted_sum') {
      const weights = config.weights ?? {};
      let total = 0;
      let weightSum = 0;
      for (const [k, v] of entries) {
        const w = weights[k] ?? 1;
        total += v * w;
        weightSum += w;
      }
      return weightSum > 0 ? Math.min(1, Math.max(0, total / weightSum)) : 0;
    }

    if (config.model === 'max') {
      return Math.min(1, Math.max(0, Math.max(...entries.map(([, v]) => v))));
    }

    const sum = entries.reduce((acc, [, v]) => acc + v, 0);
    return Math.min(1, Math.max(0, sum / entries.length));
  }
}
