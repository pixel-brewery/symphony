// #region Imports

import { describe, expect, it } from 'vitest';
import type { ModelIntelligenceDto } from '@symphony/ipc-contracts-ai';
import { teamIntelligenceTotal } from './';

// #endregion

const SCORES: ModelIntelligenceDto['scores'] = [
  {
    model: 'opus',
    reasoningEffort: 'max',
    intelligenceIndex: 63,
    matchedModelName: 'Claude Opus 5 (max)',
  },
  {
    model: 'opus',
    reasoningEffort: 'low',
    intelligenceIndex: 52,
    matchedModelName: 'Claude Opus 5 (low)',
  },
  {
    model: 'gpt-5.6-sol',
    reasoningEffort: 'high',
    intelligenceIndex: 57,
    matchedModelName: 'GPT-5.6 Sol (high)',
  },
  {
    model: 'mystery-model',
    reasoningEffort: null,
    intelligenceIndex: null,
    matchedModelName: null,
  },
];

describe('teamIntelligenceTotal', () => {
  it('adds up the scores of the chained enabled agents', () => {
    // act
    // arrange
    const total = teamIntelligenceTotal(
      [
        { model: 'opus', reasoningEffort: 'max', enabled: true },
        { model: 'gpt-5.6-sol', reasoningEffort: 'high', enabled: true },
      ],
      SCORES,
    );
    // assert
    expect(total).toBe(120);
  });

  it('skips disabled and unscored agents instead of blocking the total', () => {
    // act
    // arrange
    const total = teamIntelligenceTotal(
      [
        { model: 'opus', reasoningEffort: 'max', enabled: true },
        { model: 'opus', reasoningEffort: 'low', enabled: false },
        { model: 'mystery-model', reasoningEffort: undefined, enabled: true },
      ],
      SCORES,
    );
    // assert
    expect(total).toBe(63);
  });

  it('reports no total when no agent has a known score', () => {
    // act
    const actual = teamIntelligenceTotal([{ model: 'mystery-model', enabled: true }], SCORES);

    // assert
    expect(actual).toBeNull();
    expect(teamIntelligenceTotal([], SCORES)).toBeNull();
  });
});
