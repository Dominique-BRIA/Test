import { ProviderCategory, ProviderMetadata, AdapterMetadata } from './types';

export interface IFeatureProvider {
  name: string;
  category: ProviderCategory;
  metadata(): ProviderMetadata;
  compute(
    sourceId: string,
    targetId: string,
    context?: Record<string, unknown>,
  ): Promise<Record<string, number>>;
}

export interface IDomainAdapter {
  adapterName: string;
  adapterVersion: string;
  nodeTypes: string[];
  relationTypes: string[];
  recommendedProviders: string[];
  /** Topology hint used by RepresentationService.deduceStrategy() */
  networkTopology: 'social' | 'flow' | 'hierarchical' | 'generic';
  metadata: AdapterMetadata;
  transformToGraphNode(entity: Record<string, unknown>): import('./types').GraphNode;
  transformToGraphEdge(entity: Record<string, unknown>): Omit<import('./types').GraphEdge, 'id'>;
}

export abstract class AbstractDomainAdapter implements IDomainAdapter {
  abstract adapterName: string;
  abstract adapterVersion: string;
  abstract nodeTypes: string[];
  abstract relationTypes: string[];
  abstract recommendedProviders: string[];
  abstract networkTopology: 'social' | 'flow' | 'hierarchical' | 'generic';
  abstract metadata: AdapterMetadata;

  transformToGraphNode(entity: Record<string, unknown>): import('./types').GraphNode {
    return {
      id: String(entity['id']),
      workspace_id: String(entity['workspace_id'] ?? ''),
      type: String(entity['type']),
      attributes: entity,
    };
  }

  transformToGraphEdge(entity: Record<string, unknown>): Omit<import('./types').GraphEdge, 'id'> {
    return {
      workspace_id: String(entity['workspace_id'] ?? ''),
      source_id: String(entity['source']),
      target_id: String(entity['target']),
      type: String(entity['type']),
      weight: Number(entity['weight'] ?? 1),
    };
  }
}

export interface IEmbeddingProvider {
  name: string;
  dimension: number;
  computeEmbedding(nodeId: string, attributes: Record<string, unknown>): Promise<number[]>;
}
