import { Injectable } from '@nestjs/common';
import { RankedCandidate } from '../shared/types';

interface ScoredCandidate extends RankedCandidate {
  features: Record<string, number>;
}

@Injectable()
export class TopKSelectorService {
  select(candidates: ScoredCandidate[], k: number): ScoredCandidate[] {
    return [...candidates].sort((a, b) => b.score - a.score).slice(0, k);
  }
}
