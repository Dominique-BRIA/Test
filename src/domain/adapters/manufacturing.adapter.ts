import { Injectable } from '@nestjs/common';
import { AbstractDomainAdapter } from '../../shared/interfaces';
import { AdapterMetadata, GraphEdge, GraphNode } from '../../shared/types';

@Injectable()
export class ManufacturingAdapter extends AbstractDomainAdapter {
  adapterName = 'manufacturing';
  adapterVersion = '1.0';
  nodeTypes = ['Machine', 'Product', 'Supplier', 'ProductionLine', 'Component'];
  relationTypes = ['PRODUCES', 'DEPENDS_ON', 'SUPPLIED_BY', 'FAILURE_LINK', 'PART_OF'];
  recommendedProviders = ['failure_propagation', 'supplier_reliability', 'dependency'];
  networkTopology = 'flow' as const;
  metadata: AdapterMetadata = {
    name: 'manufacturing',
    version: '1.0',
    supportedPredictions: ['link_prediction', 'ranking', 'forecasting'],
    networkTopology: 'flow',
  };

  override transformToGraphNode(entity: Record<string, unknown>): GraphNode {
    const type = String(entity['type'] ?? '');
    if (!this.nodeTypes.includes(type)) {
      throw new Error(`Invalid node type '${type}' for ManufacturingAdapter`);
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
      throw new Error(`Invalid relation type '${type}' for ManufacturingAdapter`);
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
