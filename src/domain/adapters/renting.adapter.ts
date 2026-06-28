import { Injectable } from '@nestjs/common';
import { AbstractDomainAdapter } from '../../shared/interfaces';
import { AdapterMetadata, GraphEdge, GraphNode } from '../../shared/types';

@Injectable()
export class RentingAdapter extends AbstractDomainAdapter {
  adapterName = 'renting';
  adapterVersion = '1.0';
  nodeTypes = ['Tenant', 'Property', 'Owner', 'Location', 'Agency'];
  relationTypes = ['VISITED', 'LIKED', 'RENTED', 'REJECTED', 'OWNS', 'MANAGES', 'LOCATED_IN'];
  recommendedProviders = ['budget_compatibility', 'location_similarity', 'market_trend'];
  networkTopology = 'social' as const;
  metadata: AdapterMetadata = {
    name: 'renting',
    version: '1.0',
    supportedPredictions: ['link_prediction', 'ranking'],
    networkTopology: 'social',
  };

  override transformToGraphNode(entity: Record<string, unknown>): GraphNode {
    const type = String(entity['type'] ?? '');
    if (!this.nodeTypes.includes(type)) {
      throw new Error(`Invalid node type '${type}' for RentingAdapter`);
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
      throw new Error(`Invalid relation type '${type}' for RentingAdapter`);
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
