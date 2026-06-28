import { Injectable } from '@nestjs/common';
import { AbstractDomainAdapter } from '../../shared/interfaces';
import { AdapterMetadata, GraphEdge, GraphNode } from '../../shared/types';

@Injectable()
export class EducationAdapter extends AbstractDomainAdapter {
  adapterName = 'education';
  adapterVersion = '1.0';
  nodeTypes = ['Student', 'Course', 'Teacher', 'Skill', 'Assessment'];
  relationTypes = ['ENROLLED', 'COMPLETED', 'STRUGGLED_WITH', 'TEACHES', 'REQUIRES', 'MASTERED'];
  recommendedProviders = ['skill_gap', 'performance', 'community_overlap'];
  networkTopology = 'hierarchical' as const;
  metadata: AdapterMetadata = {
    name: 'education',
    version: '1.0',
    supportedPredictions: ['link_prediction', 'ranking'],
    networkTopology: 'hierarchical',
  };

  override transformToGraphNode(entity: Record<string, unknown>): GraphNode {
    const type = String(entity['type'] ?? '');
    if (!this.nodeTypes.includes(type)) {
      throw new Error(`Invalid node type '${type}' for EducationAdapter`);
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
      throw new Error(`Invalid relation type '${type}' for EducationAdapter`);
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
