import { Injectable } from '@nestjs/common';
import { AbstractDomainAdapter } from '../../shared/interfaces';
import { AdapterMetadata, GraphEdge, GraphNode } from '../../shared/types';

@Injectable()
export class BookStoreAdapter extends AbstractDomainAdapter {
  adapterName = 'book_store';
  adapterVersion = '1.0';
  nodeTypes = ['Reader', 'Book', 'Author', 'Genre', 'Publisher'];
  relationTypes = ['READ', 'RATED', 'LIKED', 'RECOMMENDED', 'WRITTEN_BY', 'BELONGS_TO'];
  recommendedProviders = ['genre_similarity', 'community', 'popularity'];
  networkTopology = 'social' as const;
  metadata: AdapterMetadata = {
    name: 'book_store',
    version: '1.0',
    supportedPredictions: ['link_prediction', 'ranking'],
    networkTopology: 'social',
  };

  override transformToGraphNode(entity: Record<string, unknown>): GraphNode {
    const type = String(entity['type'] ?? '');
    if (!this.nodeTypes.includes(type)) {
      throw new Error(`Invalid node type '${type}' for BookStoreAdapter`);
    }
    return {
      id: String(entity['id']),
      workspace_id: String(entity['workspace_id'] ?? ''),
      type,
      attributes: entity,
    };
  }

  override transformToGraphEdge(entity: Record<string, unknown>): Omit<GraphEdge, 'id'> {
    const type = String(entity['type'] ?? '');
    if (!this.relationTypes.includes(type)) {
      throw new Error(`Invalid relation type '${type}' for BookStoreAdapter`);
    }
    return {
      workspace_id: String(entity['workspace_id'] ?? ''),
      source_id: String(entity['source']),
      target_id: String(entity['target']),
      type,
      weight: Number(entity['weight'] ?? 1),
    };
  }
}
