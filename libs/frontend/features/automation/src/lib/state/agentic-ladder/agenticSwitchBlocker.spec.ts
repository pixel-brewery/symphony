// #region Imports

import { defaultAgenticDeliveryPolicy } from '@symphony/domain-automation';
import { describe, expect, it } from 'vitest';
import { agenticSwitchBlocker } from './agenticSwitchBlocker';
import { withAgenticLevel } from './withAgenticLevel';

// #endregion

describe('agenticSwitchBlocker', () => {
  it('needs nothing for the feature switch and the feature for observation', () => {
    // arrange
    const policy = { ...defaultAgenticDeliveryPolicy };

    // act
    const actual = [
      agenticSwitchBlocker(policy, 'enabled'),
      agenticSwitchBlocker(policy, 'observeFailures'),
    ];

    // assert
    expect(actual).toEqual([undefined, 'enabled']);
  });

  it('lets diagnosis, reruns and branch updates build on observation', () => {
    // arrange
    const policy = withAgenticLevel(defaultAgenticDeliveryPolicy, 'watch');

    // act
    const actual = (
      ['aiDiagnosisEnabled', 'ciRerunEnabled', 'managedBranchUpdatesEnabled'] as const
    ).map((key) => agenticSwitchBlocker(policy, key));

    // assert
    expect(actual).toEqual([undefined, undefined, undefined]);
  });

  it('keeps both repairs behind branch updates and replacement pull requests behind a repair', () => {
    // arrange
    const policy = withAgenticLevel(defaultAgenticDeliveryPolicy, 'diagnose');

    // act
    const actual = (
      ['sourceRepairEnabled', 'workflowRepairEnabled', 'replacementPullRequestEnabled'] as const
    ).map((key) => agenticSwitchBlocker(policy, key));

    // assert
    expect(actual).toEqual([
      'managedBranchUpdatesEnabled',
      'managedBranchUpdatesEnabled',
      'sourceRepairEnabled',
    ]);
  });

  it('accepts a replacement pull request after a workflow repair alone', () => {
    // arrange
    const policy = {
      ...withAgenticLevel(defaultAgenticDeliveryPolicy, 'diagnose'),
      managedBranchUpdatesEnabled: true,
      workflowRepairEnabled: true,
    };

    // act
    const actual = agenticSwitchBlocker(policy, 'replacementPullRequestEnabled');

    // assert
    expect(actual).toBeUndefined();
  });

  it('needs AI diagnosis before a repair', () => {
    // arrange
    const policy = {
      ...withAgenticLevel(defaultAgenticDeliveryPolicy, 'watch'),
      managedBranchUpdatesEnabled: true,
    };

    // act
    const actual = agenticSwitchBlocker(policy, 'sourceRepairEnabled');

    // assert
    expect(actual).toBe('aiDiagnosisEnabled');
  });
});
