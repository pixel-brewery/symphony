// #region Imports

import { defaultAgenticDeliveryPolicy } from '@symphony/domain-automation';
import { describe, expect, it } from 'vitest';
import { agenticLevelOf } from './agenticLevelOf';
import { withAgenticLevel } from './withAgenticLevel';
import { withAgenticSwitch } from './withAgenticSwitch';

// #endregion

describe('withAgenticSwitch', () => {
  it('sets the level to Custom when one switch changes', () => {
    // arrange
    const policy = withAgenticLevel(defaultAgenticDeliveryPolicy, 'diagnose');

    // act
    const actual = withAgenticSwitch(policy, 'ciRerunEnabled', false);

    // assert
    expect(agenticLevelOf(actual)).toBe('custom');
  });

  it('refuses to turn on a switch whose prerequisite is off', () => {
    // arrange
    const policy = withAgenticLevel(defaultAgenticDeliveryPolicy, 'diagnose');

    // act
    const actual = withAgenticSwitch(policy, 'sourceRepairEnabled', true);

    // assert
    expect(actual).toBe(policy);
  });

  it('turns off every switch that loses its prerequisite', () => {
    // arrange
    const policy = withAgenticLevel(defaultAgenticDeliveryPolicy, 'full');

    // act
    const withoutBranchUpdates = withAgenticSwitch(policy, 'managedBranchUpdatesEnabled', false);
    const withoutFeature = withAgenticSwitch(policy, 'enabled', false);

    // assert
    expect(withoutBranchUpdates).toMatchObject({
      aiDiagnosisEnabled: true,
      ciRerunEnabled: true,
      sourceRepairEnabled: false,
      workflowRepairEnabled: false,
      replacementPullRequestEnabled: false,
    });
    expect(agenticLevelOf(withoutBranchUpdates)).toBe('diagnose');
    expect(agenticLevelOf(withoutFeature)).toBe('off');
  });

  it('keeps a replacement pull request while the other repair stays on', () => {
    // arrange
    const policy = withAgenticLevel(defaultAgenticDeliveryPolicy, 'full');

    // act
    const actual = withAgenticSwitch(policy, 'sourceRepairEnabled', false);

    // assert
    expect(actual).toMatchObject({
      sourceRepairEnabled: false,
      workflowRepairEnabled: true,
      replacementPullRequestEnabled: true,
    });
  });
});
