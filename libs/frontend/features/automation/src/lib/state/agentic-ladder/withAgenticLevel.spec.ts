// #region Imports

import { defaultAgenticDeliveryPolicy } from '@symphony/domain-automation';
import { describe, expect, it } from 'vitest';
import { agenticLevelOf } from './agenticLevelOf';
import { withAgenticLevel } from './withAgenticLevel';

// #endregion

describe('withAgenticLevel', () => {
  it('sets the confirmed switches of every level', () => {
    // arrange
    const policy = { ...defaultAgenticDeliveryPolicy };

    // act
    const watch = withAgenticLevel(policy, 'watch');
    const diagnose = withAgenticLevel(policy, 'diagnose');
    const repair = withAgenticLevel(policy, 'repair');
    const full = withAgenticLevel(policy, 'full');

    // assert
    expect(watch).toMatchObject({
      enabled: true,
      observeFailures: true,
      aiDiagnosisEnabled: false,
      ciRerunEnabled: false,
    });
    expect(diagnose).toMatchObject({
      aiDiagnosisEnabled: true,
      ciRerunEnabled: true,
      managedBranchUpdatesEnabled: false,
      sourceRepairEnabled: false,
    });
    expect(repair).toMatchObject({
      managedBranchUpdatesEnabled: true,
      sourceRepairEnabled: true,
      workflowRepairEnabled: true,
      replacementPullRequestEnabled: false,
    });
    expect(full).toMatchObject({ replacementPullRequestEnabled: true });
    expect([watch, diagnose, repair, full].map(agenticLevelOf)).toEqual([
      'watch',
      'diagnose',
      'repair',
      'full',
    ]);
  });

  it('turns every ladder switch off for Off and keeps budgets and the other switches', () => {
    // arrange
    const policy = {
      ...withAgenticLevel(defaultAgenticDeliveryPolicy, 'full'),
      reviewFeedbackEnabled: true,
      conflictSerializationEnabled: true,
      dailyTokenBudget: 123_000,
    };

    // act
    const actual = withAgenticLevel(policy, 'off');

    // assert
    expect(agenticLevelOf(actual)).toBe('off');
    expect(actual).toMatchObject({
      reviewFeedbackEnabled: true,
      conflictSerializationEnabled: true,
      dailyTokenBudget: 123_000,
    });
  });

  it('changes nothing for Custom', () => {
    // arrange
    const policy = { ...defaultAgenticDeliveryPolicy, enabled: true };

    // act
    const actual = withAgenticLevel(policy, 'custom');

    // assert
    expect(actual).toBe(policy);
  });
});
