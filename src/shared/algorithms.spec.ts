import { computeFitnessScore, pageRank, wattsStrogatz } from './algorithms';

const mockEdge = (
  id: string,
  source: string,
  target: string,
  weight = 1,
) => ({
  id,
  workspace_id: 'ws1',
  source_id: source,
  target_id: target,
  type: 'LINK',
  weight,
});

describe('computeFitnessScore', () => {
  it('returns 0 for a node with no edges', () => {
    expect(computeFitnessScore('n1', [])).toBe(0);
  });

  it('returns 1 for a node that is the only hub', () => {
    const edges = [
      mockEdge('e1', 'n1', 'n2'),
      mockEdge('e2', 'n1', 'n3'),
      mockEdge('e3', 'n1', 'n4'),
    ];
    const score = computeFitnessScore('n1', edges);
    expect(score).toBeCloseTo(1, 5);
  });

  it('returns a value between 0 and 1 inclusive', () => {
    const edges = [
      mockEdge('e1', 'n1', 'n2', 0.5),
      mockEdge('e2', 'n2', 'n3', 1.0),
      mockEdge('e3', 'n1', 'n3', 0.8),
    ];
    const score = computeFitnessScore('n1', edges);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});

describe('pageRank', () => {
  it('returns a score for every node', () => {
    const edges = [
      mockEdge('e1', 'n1', 'n2'),
      mockEdge('e2', 'n2', 'n3'),
      mockEdge('e3', 'n3', 'n1'),
    ];
    const result = pageRank(['n1', 'n2', 'n3'], edges);
    expect(result.size).toBe(3);
    expect(result.has('n1')).toBe(true);
  });

  it('scores all nodes positively', () => {
    const edges = [mockEdge('e1', 'n1', 'n2'), mockEdge('e2', 'n2', 'n1')];
    const result = pageRank(['n1', 'n2'], edges);
    for (const score of result.values()) {
      expect(score).toBeGreaterThan(0);
    }
  });

  it('returns scores in descending order', () => {
    const edges = [
      mockEdge('e1', 'n1', 'n2'),
      mockEdge('e2', 'n1', 'n3'),
      mockEdge('e3', 'n2', 'n1'),
    ];
    const result = pageRank(['n1', 'n2', 'n3'], edges);
    const values = Array.from(result.values());
    for (let i = 0; i < values.length - 1; i++) {
      expect(values[i]).toBeGreaterThanOrEqual(values[i + 1]);
    }
  });
});

describe('wattsStrogatz', () => {
  it('regular ring lattice (p=0) gives each node exactly k edges', () => {
    const N = 20;
    const k = 4;
    const { edges } = wattsStrogatz(N, k, 0);

    const degree = new Map<string, number>();
    for (const e of edges) {
      degree.set(e.source_id, (degree.get(e.source_id) ?? 0) + 1);
      degree.set(e.target_id, (degree.get(e.target_id) ?? 0) + 1);
    }

    for (const d of degree.values()) {
      expect(d).toBe(k);
    }
  });

  it('total edge count equals N*k/2 regardless of rewiring', () => {
    const N = 30;
    const k = 4;
    const { edges } = wattsStrogatz(N, k, 0.5);
    expect(edges.length).toBe((N * k) / 2);
  });

  it('produces no self-loops', () => {
    const { edges } = wattsStrogatz(40, 4, 0.3);
    for (const e of edges) {
      expect(e.source_id).not.toBe(e.target_id);
    }
  });

  it('has clustering coefficient > 0.3 for low rewiring probability', () => {
    const N = 100;
    const k = 6;
    const { nodes, edges } = wattsStrogatz(N, k, 0.1);

    const adj = new Map<string, Set<string>>();
    for (const n of nodes) adj.set(n.id, new Set());
    for (const e of edges) {
      adj.get(e.source_id)!.add(e.target_id);
      adj.get(e.target_id)!.add(e.source_id);
    }

    let totalClustering = 0;
    for (const [nodeId, neighbors] of adj.entries()) {
      const nbArr = Array.from(neighbors);
      const deg = nbArr.length;
      if (deg < 2) continue;
      let triangles = 0;
      for (let i = 0; i < nbArr.length; i++) {
        for (let j = i + 1; j < nbArr.length; j++) {
          if (adj.get(nbArr[i])?.has(nbArr[j])) triangles++;
        }
      }
      totalClustering += (2 * triangles) / (deg * (deg - 1));
      void nodeId;
    }

    const avgClustering = totalClustering / N;
    expect(avgClustering).toBeGreaterThan(0.3);
  });
});
