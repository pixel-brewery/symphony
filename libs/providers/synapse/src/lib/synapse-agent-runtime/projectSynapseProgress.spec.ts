// #region Imports

import { describe, expect, it } from 'vitest';
import { parseSessionReference, type IAiSessionReference } from '@pixel-brewery/synapse-core';
import { projectSynapseProgress } from './projectSynapseProgress.js';

// #endregion

describe('projectSynapseProgress', () => {
  it('persists the full session affinity and authentication generation in the opaque continuation', () => {
    // arrange
    const session: IAiSessionReference = {
      driverId: 'fixture-driver',
      instanceId: 'fixture-instance',
      profileId: 'fixture-profile',
      candidateId: 'fixture-candidate',
      nativeId: 'fixture-native-session',
      authenticationGeneration: 'fixture-authentication-generation',
    };

    // act
    const progress = projectSynapseProgress({ type: 'session', session }, 'CLI assistant');

    // assert
    expect(progress?.continuationReference).toBeDefined();
    expect(parseSessionReference(progress!.continuationReference!)).toEqual(session);
  });

  it('redacts native credential-shaped text before existing progress persistence', () => {
    // arrange
    const event = {
      type: 'text' as const,
      text: 'Checked token=synthetic-private-value and the requested contract.',
    };

    // act
    const progress = projectSynapseProgress(event, 'CLI assistant');

    // assert
    expect(progress).toMatchObject({ actor: 'CLI assistant', category: 'message' });
    expect(progress?.message).toContain('[redacted]');
    expect(progress?.message).not.toContain('synthetic-private-value');
  });

  it('retains real file-change progress without exposing shell payloads', () => {
    // arrange
    const event = {
      type: 'progress' as const,
      category: 'file-change' as const,
      message: 'Changed src/Feature.ts.',
    };

    // act
    const progress = projectSynapseProgress(event, 'CLI assistant');

    // assert
    expect(progress).toEqual({
      actor: 'CLI assistant',
      category: 'file-change',
      message: 'Changed src/Feature.ts.',
    });
  });
});
