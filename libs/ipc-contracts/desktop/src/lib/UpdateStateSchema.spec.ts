// #region Imports

import { describe, expect, it } from 'vitest';
import { updateStateSchema } from './UpdateStateSchema';

// #endregion

describe('updateStateSchema', () => {
  it('accepts an installer-only update without exposing its download URL', () => {
    // arrange
    const state = {
      kind: 'available',
      currentVersion: '0.1.10',
      targetVersion: '0.1.11',
      channel: 'stable',
      lastCheckedAt: '2026-09-07T12:00:00.000Z',
    };

    // act
    const parsed = updateStateSchema.parse(state);

    // assert
    expect(parsed).toEqual(state);
    expect(parsed).not.toHaveProperty('downloadUrl');
  });
});
