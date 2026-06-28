import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GraphService } from './graph.service';
import { POSTGRES_POOL } from '../config/postgres.provider';
import { NEO4J_DRIVER } from '../config/neo4j.provider';

const mockQuery = jest.fn();
const mockPg = { query: mockQuery };

const mockSession = {
  run: jest.fn(),
  close: jest.fn(),
};
const mockNeo4j = { session: jest.fn().mockReturnValue(mockSession) };

describe('GraphService', () => {
  let service: GraphService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GraphService,
        { provide: POSTGRES_POOL, useValue: mockPg },
        { provide: NEO4J_DRIVER, useValue: mockNeo4j },
      ],
    }).compile();

    service = module.get(GraphService);
  });

  describe('createNode', () => {
    it('returns the created node', async () => {
      const node = {
        id: 'n1',
        workspace_id: 'ws1',
        type: 'Student',
        attributes: { name: 'Alice' },
      };
      mockQuery.mockResolvedValueOnce({ rows: [{ ...node, created_at: '2024-01-01' }] });

      const result = await service.createNode(node);

      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO nodes'),
        [node.id, node.workspace_id, node.type, node.attributes],
      );
      expect(result.id).toBe('n1');
    });

    it('returns the existing node on ON CONFLICT DO NOTHING (upsert)', async () => {
      const node = { id: 'n1', workspace_id: 'ws1', type: 'Student', attributes: {} };
      mockQuery
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [node] });

      const result = await service.createNode(node);
      expect(result.id).toBe('n1');
    });
  });

  describe('createEdge', () => {
    it('creates an edge after verifying both nodes exist', async () => {
      const sourceNode = { id: 'n1', workspace_id: 'ws1', type: 'Student', attributes: {} };
      const targetNode = { id: 'n2', workspace_id: 'ws1', type: 'Course', attributes: {} };
      const edge = {
        workspace_id: 'ws1',
        source_id: 'n1',
        target_id: 'n2',
        type: 'ENROLLED',
        weight: 1,
      };
      mockQuery
        .mockResolvedValueOnce({ rows: [sourceNode] })
        .mockResolvedValueOnce({ rows: [targetNode] })
        .mockResolvedValueOnce({ rows: [{ ...edge, id: 'e1' }] });

      const result = await service.createEdge(edge);
      expect(result.id).toBe('e1');
    });

    it('throws NotFoundException when source node does not exist', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.createEdge({
          workspace_id: 'ws1',
          source_id: 'missing',
          target_id: 'n2',
          type: 'ENROLLED',
          weight: 1,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('querySubgraph', () => {
    it('runs the correct Cypher query with provided parameters', async () => {
      mockSession.run.mockResolvedValueOnce({
        records: [
          {
            get: (key: string) => {
              if (key === 'n') return { properties: { id: 'n2', type: 'Course', workspace_id: 'ws1', attributes: {} } };
              if (key === 'r') return { type: 'ENROLLED', properties: { weight: 1 }, startNodeElementId: 'n1', endNodeElementId: 'n2', elementId: 'e1' };
              return null;
            },
          },
        ],
      });

      await service.querySubgraph('n1', 2, ['ENROLLED'], ['Course']);

      expect(mockSession.run).toHaveBeenCalledWith(
        expect.stringContaining('MATCH'),
        expect.objectContaining({ rootNode: 'n1', depth: 2 }),
      );
    });

    it('respects the depth parameter in Cypher path length', async () => {
      mockSession.run.mockResolvedValueOnce({ records: [] });

      await service.querySubgraph('n1', 3, ['TEACHES']);

      const cypher: string = mockSession.run.mock.calls[0][0];
      expect(cypher).toContain('*1..$depth');
      expect(mockSession.run.mock.calls[0][1]).toMatchObject({ depth: 3 });
    });
  });

  describe('getNodeDegree', () => {
    it('returns correct in and out degree counts', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ count: '3' }] })
        .mockResolvedValueOnce({ rows: [{ count: '5' }] });

      const degree = await service.getNodeDegree('n1');

      expect(degree).toEqual({ in: 3, out: 5 });
    });
  });
});
