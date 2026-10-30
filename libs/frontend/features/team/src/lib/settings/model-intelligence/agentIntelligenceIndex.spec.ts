// #region Imports

import { describe, expect, it } from 'vitest';
import type { ModelIntelligenceDto } from '@symphony/ipc-contracts-ai';
import { agentIntelligenceIndex } from './';

// #endregion

const SCORES: ModelIntelligenceDto['scores'] = [
  { model: 'opus', reasoningEffort: 'max', intelligenceIndex: 63, matchedModelName: 'Opus max' },
  { model: 'opus', reasoningEffort: 'low', intelligenceIndex: 52, matchedModelName: 'Opus low' },
  {
    model: 'mystery-model',
    reasoningEffort: null,
    intelligenceIndex: null,
    matchedModelName: null,
  },
];

describe('agentIntelligenceIndex', () => {
  it('resolves the score of the exact model and effort combination', () => {
    // act
    const actual = agentIntelligenceIndex({ model: 'opus', reasoningEffort: 'max' }, SCORES);

    // assert
    expect(actual).toBe(63);
    expect(agentIntelligenceIndex({ model: 'opus', reasoningEffort: 'low' }, SCORES)).toBe(52);
  });

  it('reports no score for unknown combinations or agents without a model', () => {
    // act
    const actual = agentIntelligenceIndex({ model: 'opus', reasoningEffort: 'medium' }, SCORES);

    // assert
    expect(actual).toBeNull();
    expect(agentIntelligenceIndex({ model: 'mystery-model' }, SCORES)).toBeNull();
    expect(agentIntelligenceIndex({}, SCORES)).toBeNull();
  });
});
