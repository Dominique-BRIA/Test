/**
 * Exponential half-life decay: a link created `ageDays` ago retains
 *   baseWeight × 0.5^(ageDays / halfLifeDays)
 * of its original strength.  Default half-life = 180 days.
 */
export function applyTemporalDecay(
  baseWeight: number,
  eventTime: Date | string,
  halfLifeDays = 180,
): number {
  const ageDays = (Date.now() - new Date(eventTime).getTime()) / 86_400_000;
  return baseWeight * Math.pow(0.5, ageDays / halfLifeDays);
}

export function computeFitnessScore(
  nodeId: string,
  edges: { source_id: string; target_id: string; weight: number }[],
): number {
  const degreeMap = new Map<string, number>();
  for (const edge of edges) {
    degreeMap.set(edge.source_id, (degreeMap.get(edge.source_id) ?? 0) + 1);
    degreeMap.set(edge.target_id, (degreeMap.get(edge.target_id) ?? 0) + 1);
  }

  const nodeDegree = degreeMap.get(nodeId) ?? 0;
  if (nodeDegree === 0) return 0;

  const nodeEdges = edges.filter((e) => e.source_id === nodeId || e.target_id === nodeId);
  const avgWeight = nodeEdges.reduce((sum, e) => sum + e.weight, 0) / nodeEdges.length;

  const maxDegree = Math.max(...Array.from(degreeMap.values()));
  if (maxDegree === 0) return 0;

  return Math.min(1, Math.max(0, (nodeDegree * avgWeight) / maxDegree));
}

export function pageRank(
  nodeIds: string[],
  edges: { source_id: string; target_id: string }[],
  dampingFactor = 0.85,
  iterations = 20,
): Map<string, number> {
  const N = nodeIds.length;
  if (N === 0) return new Map();

  const scores = new Map<string, number>(nodeIds.map((id) => [id, 1 / N]));

  const inLinks = new Map<string, string[]>(nodeIds.map((id) => [id, []]));
  const outDegree = new Map<string, number>(nodeIds.map((id) => [id, 0]));

  for (const edge of edges) {
    if (!inLinks.has(edge.target_id)) inLinks.set(edge.target_id, []);
    inLinks.get(edge.target_id)!.push(edge.source_id);
    outDegree.set(edge.source_id, (outDegree.get(edge.source_id) ?? 0) + 1);
  }

  for (let i = 0; i < iterations; i++) {
    const next = new Map<string, number>();
    for (const p of nodeIds) {
      const sum = (inLinks.get(p) ?? []).reduce((acc, q) => {
        return acc + (scores.get(q) ?? 0) / Math.max(outDegree.get(q) ?? 1, 1);
      }, 0);
      next.set(p, (1 - dampingFactor) / N + dampingFactor * sum);
    }
    next.forEach((v, k) => scores.set(k, v));
  }

  return new Map([...scores.entries()].sort((a, b) => b[1] - a[1]));
}

export function wattsStrogatz(
  N: number,
  k: number,
  p: number,
): { nodes: string[]; edges: { source_id: string; target_id: string }[] } {
  const nodes = Array.from({ length: N }, (_, i) => `node_${i}`);
  const adjacency = new Set<string>();
  const finalEdges: { source_id: string; target_id: string }[] = [];

  const edgeKey = (u: string, v: string): string => (u < v ? `${u}|${v}` : `${v}|${u}`);

  const ringEdges: { source_id: string; target_id: string }[] = [];
  const halfK = Math.floor(k / 2);
  for (let i = 0; i < N; i++) {
    for (let j = 1; j <= halfK; j++) {
      const u = nodes[i];
      const v = nodes[(i + j) % N];
      const key = edgeKey(u, v);
      if (!adjacency.has(key)) {
        adjacency.add(key);
        ringEdges.push({ source_id: u, target_id: v });
      }
    }
  }

  for (const e of ringEdges) {
    const u = e.source_id;
    const v = e.target_id;
    if (Math.random() < p) {
      adjacency.delete(edgeKey(u, v));
      const candidates = nodes.filter((n) => n !== u && !adjacency.has(edgeKey(u, n)));
      if (candidates.length > 0) {
        const newV = candidates[Math.floor(Math.random() * candidates.length)];
        adjacency.add(edgeKey(u, newV));
        finalEdges.push({ source_id: u, target_id: newV });
      } else {
        adjacency.add(edgeKey(u, v));
        finalEdges.push({ source_id: u, target_id: v });
      }
    } else {
      finalEdges.push({ source_id: u, target_id: v });
    }
  }

  return { nodes, edges: finalEdges };
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// Label-propagation community detection (~Louvain in spirit, O(iterations × edges))
export function detectCommunities(
  nodeIds: string[],
  edges: { source_id: string; target_id: string }[],
): Map<string, number> {
  const labels = new Map<string, number>(nodeIds.map((id, i) => [id, i]));
  const adj = new Map<string, string[]>(nodeIds.map((id) => [id, []]));

  for (const e of edges) {
    adj.get(e.source_id)?.push(e.target_id);
    adj.get(e.target_id)?.push(e.source_id);
  }

  for (let iter = 0; iter < 10; iter++) {
    for (const node of nodeIds) {
      const neighbors = adj.get(node) ?? [];
      if (neighbors.length === 0) continue;
      const freq = new Map<number, number>();
      for (const n of neighbors) {
        const l = labels.get(n);
        if (l !== undefined) freq.set(l, (freq.get(l) ?? 0) + 1);
      }
      let bestLabel = labels.get(node)!;
      let bestCount = 0;
      for (const [label, count] of freq) {
        if (count > bestCount) {
          bestCount = count;
          bestLabel = label;
        }
      }
      labels.set(node, bestLabel);
    }
  }

  return labels;
}
