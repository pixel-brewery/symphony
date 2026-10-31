// #region Imports

import { defaultAgenticDeliveryPolicy } from '@symphony/domain-automation';
import { describe, expect, it } from 'vitest';
import { agenticLevelOf } from './agenticLevelOf';

// #endregion

describe('agenticLevelOf', () => {
  it.each([
    [{}, 'off'],
    [{ enabled: true, observeFailures: true }, 'watch'],
    [
      { enabled: true, observeFailures: true, aiDiagnosisEnabled: true, ciRerunEnabled: true },
      'diagnose',
    ],
    [
      {
        enabled: true,
        observeFailures: true,
        aiDiagnosisEnabled: true,
        ciRerunEnabled: true,
        managedBranchUpdatesEnabled: true,
        sourceRepairEnabled: true,
        workflowRepairEnabled: true,
      },
      'repair',
    ],
    [
      {
        enabled: true,
        observeFailures: true,
        aiDiagnosisEnabled: true,
        ciRerunEnabled: true,
        managedBranchUpdatesEnabled: true,
        sourceRepairEnabled: true,
        workflowRepairEnabled: true,
        replacementPullRequestEnabled: true,
      },
      'full',
    ],
    [{ enabled: true, observeFailures: true, aiDiagnosisEnabled: true }, 'custom'],
  ])('reads %o as %s', (switches, level) => {
    // arrange
    const policy = { ...defaultAgenticDeliveryPolicy, ...switches };

    // act
    const actual = agenticLevelOf(policy);

    // assert
    expect(actual).toBe(level);
  });

  it('ignores the switches outside the ladder', () => {
    // arrange
    const policy = {
      ...defaultAgenticDeliveryPolicy,
      enabled: true,
      observeFailures: true,
      reviewFeedbackEnabled: true,
      conflictSerializationEnabled: true,
    };

    // act
    const actual = agenticLevelOf(policy);

    // assert
    expect(actual).toBe('watch');
  });
});
