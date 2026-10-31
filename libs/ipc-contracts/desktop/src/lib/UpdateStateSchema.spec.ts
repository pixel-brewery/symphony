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

  it('carries bounded download progress and keeps the indeterminate native download valid', () => {
    // arrange
    const measured = {
      kind: 'downloading',
      currentVersion: '0.1.10',
      channel: 'stable',
      targetVersion: '0.1.11',
      progress: 0.42,
    };
    const indeterminate = { kind: 'downloading', currentVersion: '0.1.10', channel: 'stable' };

    // act
    const parsedMeasured = updateStateSchema.parse(measured);
    const parsedIndeterminate = updateStateSchema.parse(indeterminate);

    // assert
    expect(parsedMeasured).toEqual(measured);
    expect(parsedIndeterminate).toEqual(indeterminate);
    expect(() => updateStateSchema.parse({ ...measured, progress: 1.01 })).toThrow();
    expect(() => updateStateSchema.parse({ ...measured, progress: -0.01 })).toThrow();
  });
});
