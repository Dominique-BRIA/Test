export interface GraphNode {
  id: string;
  workspace_id: string;
  type: string;
  attributes: Record<string, unknown>;
  created_at?: Date | string;
}

export interface GraphEdge {
  id: string;
  workspace_id: string;
  source_id: string;
  target_id: string;
  type: string;
  weight: number;
  weight_strategy?: WeightStrategy;
  event_time?: Date | string;
}

export interface NodeFeatures {
  node_id: string;
  workspace_id: string;
  version: number;
  features: Record<string, number>;
}

export interface PairFeatures {
  source_id: string;
  target_id: string;
  workspace_id: string;
  provider_name: string;
  features: Record<string, number>;
}

export interface NodeEmbedding {
  node_id: string;
  workspace_id: string;
  provider: string;
  vector: number[];
  dimension: number;
  version: number;
}

export interface Prediction {
  workspace_id: string;
  source_id: string;
  target_id: string;
  score: number;
}

export interface PredictionJob {
  id: string;
  workspace_id: string;
  source_id: string;
  target_id: string;
  pipeline_config: PipelineConfig;
  status: 'pending' | 'running' | 'completed' | 'failed';
  result?: Record<string, number>;
  error?: string;
  created_at?: Date | string;
  completed_at?: Date | string;
}

export interface PipelineConfig {
  features: string[];
  model: 'weighted_sum' | 'mean' | 'max';
  weights?: Record<string, number>;
}

export interface ProviderMetadata {
  name: string;
  version: string;
  category: ProviderCategory;
  outputKeys: string[];
}

export interface AdapterMetadata {
  name: string;
  version: string;
  supportedPredictions: string[];
  networkTopology: 'social' | 'flow' | 'hierarchical' | 'generic';
}

export interface ApiResponse<T> {
  data: T;
  error?: string;
  meta?: Record<string, unknown>;
}

export type ProviderCategory = 'graph' | 'attribute' | 'embedding' | 'external';

export interface RankedCandidate {
  id: string;
  score: number;
  explanations?: string[];
}

export type WeightStrategy = 'explicit' | 'temporal' | 'auto';

export type RankingStrategy = 'similarity' | 'influence' | 'community' | 'promising_node' | 'auto';
