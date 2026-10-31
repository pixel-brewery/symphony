// #region Imports

import { describe, expect, it } from 'vitest';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';
import { modelIntelligenceTargets } from './';

// #endregion

describe('modelIntelligenceTargets', () => {
  it('collects unique enabled model and effort pairs in a stable order', () => {
    // arrange
    const settings = settingsWithCandidates([
      { model: 'opus', reasoningEffort: 'max', enabled: true },
      { model: 'opus', reasoningEffort: 'max', enabled: true },
      { model: 'opus', reasoningEffort: 'low', enabled: true },
      { model: 'gpt-5.6-sol', reasoningEffort: 'high', enabled: true },
      { model: 'disabled-model', reasoningEffort: 'high', enabled: false },
      { model: null, reasoningEffort: 'high', enabled: true },
    ]);

    // act
    const actual = modelIntelligenceTargets(settings);

    // assert
    expect(actual).toEqual([
      { model: 'gpt-5.6-sol', reasoningEffort: 'high' },
      { model: 'opus', reasoningEffort: 'low' },
      { model: 'opus', reasoningEffort: 'max' },
    ]);
  });
});

function settingsWithCandidates(
  candidates: readonly {
    model: string | null;
    reasoningEffort: string | null;
    enabled: boolean;
  }[],
): ApplicationSettingsDto {
  return {
    agentRoutePolicies: [
      {
        id: 'route',
        candidates: candidates.map((candidate, index) => ({
          id: `candidate-${index}`,
          priority: index,
          ...candidate,
        })),
      },
    ],
  } as unknown as ApplicationSettingsDto;
}
