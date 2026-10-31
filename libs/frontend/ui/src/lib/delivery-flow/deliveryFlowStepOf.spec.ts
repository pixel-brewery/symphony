// #region Imports

import { processRoles } from '@symphony/domain-workflow';
import { describe, expect, it } from 'vitest';
import { deliveryFlowStepOf } from './deliveryFlowStepOf';

// #endregion

describe('deliveryFlowStepOf', () => {
  it('places every agent responsibility and every built-in process role in exactly one step', () => {
    // arrange
    const skillFlowRoles = [
      'work-item-creation',
      'analysis',
      'solution',
      'ci-diagnosis',
      'ci-repair',
      'pull-request-review',
    ];
    const roles: readonly string[] = [...skillFlowRoles, ...processRoles];

    // act
    const steps = roles.map((role) => deliveryFlowStepOf(role)?.id);

    // assert
    expect(steps).not.toContain(undefined);
  });

  it('keeps the two failed-check roles and both implementation roles in one step each', () => {
    // act
    const actual = ['ci-diagnosis', 'ci-repair', 'solution', 'solve', 'verify'].map(
      (role) => deliveryFlowStepOf(role)?.label,
    );

    // assert
    expect(actual).toEqual([
      'Fix failed checks',
      'Fix failed checks',
      'Implement and verify',
      'Implement and verify',
      'Implement and verify',
    ]);
  });

  it('returns nothing for an unknown role', () => {
    // act
    const actual = deliveryFlowStepOf('deploy');

    // assert
    expect(actual).toBeUndefined();
  });
});
