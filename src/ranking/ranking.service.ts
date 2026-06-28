import { Injectable } from '@nestjs/common';
import { FeatureService } from '../feature/feature.service';
import { RepresentationService } from '../representation/representation.service';
import { DomainRegistry } from '../domain/domain.registry';
import { RankedCandidate, RankingStrategy } from '../shared/types';
import {
  pageRank,
  computeFitnessScore,
  cosineSimilarity,
  detectCommunities,
  applyTemporalDecay,
} from '../shared/algorithms';
import { CandidateGeneratorService } from './candidate-generator.service';
import { TopKSelectorService } from './top-k-selector.service';
import { ExplanationService } from './explanation.service';
import { PrismaService } from '../prisma/prisma.service';

interface ScoredCandidate {
  id: string;
  score: number;
  features: Record<string, number>;
}

type EdgeRow = {
  source_id: string;
  target_id: string;
  weight: number;
  weight_strategy: string;
  event_time: Date | string;
};

@Injectable()
export class RankingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly candidateGenerator: CandidateGeneratorService,
    private readonly topKSelector: TopKSelectorService,
    private readonly explanationService: ExplanationService,
    private readonly featureService: FeatureService,
    private readonly representationService: RepresentationService,
    private readonly domainRegistry: DomainRegistry,
  ) {}

  async topK(
    sourceId: string,
    _relation: string,
    k: number,
    strategy: RankingStrategy = 'promising_node',
    workspaceId: string,
  ): Promise<RankedCandidate[]> {
    const candidateLimit = Math.min(Math.max(k * 25, 200), 1000);

    const candidateIds = await this.candidateGenerator.generate(
      sourceId,
      workspaceId,
      candidateLimit,
    );
    if (candidateIds.length === 0) return [];

    const resolvedStrategy =
      strategy === 'auto'
        ? await this.deduceStrategyForWorkspace(sourceId, workspaceId)
        : strategy;

    const scored = await this.scoreCandidates(
      sourceId,
      candidateIds,
      resolvedStrategy,
      workspaceId,
    );

    const topCandidates = this.topKSelector.select(scored, k);

    return topCandidates.map((c) => ({
      id: c.id,
      score: c.score,
      explanations: this.explanationService.explain(c.features),
    }));
  }

  private async scoreCandidates(
    sourceId: string,
    candidateIds: string[],
    strategy: RankingStrategy,
    workspaceId: string,
  ): Promise<ScoredCandidate[]> {
    switch (strategy) {
      case 'similarity':
        return this.scoreBySimilarity(sourceId, candidateIds);
      case 'influence':
        return this.scoreByInfluence(candidateIds, workspaceId);
      case 'community':
        return this.scoreByCommunity(sourceId, candidateIds, workspaceId);
      case 'promising_node':
      case 'auto':
        return this.scoreByPromisingNode(sourceId, candidateIds, workspaceId);
    }
  }

  private async scoreBySimilarity(
    sourceId: string,
    candidates: string[],
  ): Promise<ScoredCandidate[]> {
    const sourceVec = await this.representationService.retrieve(sourceId, 'default');
    if (!sourceVec) return candidates.map((id) => ({ id, score: 0, features: {} }));

    return Promise.all(
      candidates.map(async (id) => {
        const vec = await this.representationService.retrieve(id, 'default');
        const sim = vec ? cosineSimilarity(sourceVec, vec) : 0;
        return { id, score: sim, features: { cosine_similarity: sim } };
      }),
    );
  }

  private async scoreByInfluence(
    candidates: string[],
    workspaceId: string,
  ): Promise<ScoredCandidate[]> {
    const edges = await this.loadEdges(candidates, workspaceId);
    const effectiveEdges = this.applyDecay(edges);
    const ranks = pageRank(candidates, effectiveEdges);

    return candidates.map((id) => {
      const rank = ranks.get(id) ?? 0;
      const fitness = computeFitnessScore(id, effectiveEdges);
      return { id, score: (rank + fitness) / 2, features: { page_rank: rank, fitness } };
    });
  }

  private async scoreByCommunity(
    sourceId: string,
    candidates: string[],
    workspaceId: string,
  ): Promise<ScoredCandidate[]> {
    const allNodes = [sourceId, ...candidates];
    const edges = await this.loadEdges(allNodes, workspaceId);
    const effectiveEdges = this.applyDecay(edges);
    const communities = detectCommunities(allNodes, effectiveEdges);
    const sourceCommunity = communities.get(sourceId);

    return candidates.map((id) => {
      const sameCommunity = communities.get(id) === sourceCommunity ? 1 : 0;
      const fitness = computeFitnessScore(id, effectiveEdges);
      const score = sameCommunity * 0.7 + fitness * 0.3;
      return { id, score, features: { same_community: sameCommunity, fitness } };
    });
  }

  private async scoreByPromisingNode(
    sourceId: string,
    candidates: string[],
    workspaceId: string,
  ): Promise<ScoredCandidate[]> {
    const edges = await this.loadEdges([sourceId, ...candidates], workspaceId);
    const effectiveEdges = this.applyDecay(edges);
    const ranks = pageRank([sourceId, ...candidates], effectiveEdges);

    return Promise.all(
      candidates.map(async (id) => {
        const featureVec = await this.featureService.composite(
          ['community_overlap', 'feature_score'],
          sourceId,
          id,
        );
        const rank = ranks.get(id) ?? 0;
        const fitness = computeFitnessScore(id, effectiveEdges);
        const featureValues = Object.values(featureVec);
        const featureScore =
          featureValues.length > 0
            ? featureValues.reduce((a, b) => a + b, 0) / featureValues.length
            : 0;
        const score = rank * 0.3 + fitness * 0.3 + featureScore * 0.4;
        return { id, score, features: { ...featureVec, page_rank: rank, fitness } };
      }),
    );
  }

  private async loadEdges(nodeIds: string[], workspaceId: string): Promise<EdgeRow[]> {
    return this.prisma.edge.findMany({
      where: {
        workspace_id: workspaceId,
        OR: [
          { source_id: { in: nodeIds } },
          { target_id: { in: nodeIds } },
        ],
      },
      select: { source_id: true, target_id: true, weight: true, weight_strategy: true, event_time: true },
    });
  }

  private applyDecay(
    edges: EdgeRow[],
  ): { source_id: string; target_id: string; weight: number }[] {
    return edges.map((e) => ({
      source_id: e.source_id,
      target_id: e.target_id,
      weight:
        e.weight_strategy === 'temporal' && e.event_time
          ? applyTemporalDecay(e.weight, e.event_time instanceof Date ? e.event_time.toISOString() : e.event_time)
          : e.weight,
    }));
  }

  private async deduceStrategyForWorkspace(
    sourceId: string,
    workspaceId: string,
  ): Promise<RankingStrategy> {
    try {
      const workspace = await this.prisma.workspace.findUnique({
        where: { id: workspaceId },
        select: { adapter_name: true },
      });
      const adapter = workspace?.adapter_name
        ? this.domainRegistry.get(workspace.adapter_name)
        : undefined;
      if (!adapter) return 'promising_node';

      const node = await this.prisma.node.findUnique({
        where: { id: sourceId },
        select: { attributes: true },
      });
      const attributes = (node?.attributes ?? {}) as Record<string, unknown>;

      return this.representationService.deduceStrategy(adapter, attributes);
    } catch {
      return 'promising_node';
    }
  }
}
