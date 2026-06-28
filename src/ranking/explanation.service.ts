import { Injectable } from '@nestjs/common';

@Injectable()
export class ExplanationService {
  explain(features: Record<string, number>): string[] {
    return Object.entries(features)
      .filter(([k]) => !k.startsWith('_'))
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([key, value]) => `${key}: ${(value * 100).toFixed(0)}%`);
  }
}
