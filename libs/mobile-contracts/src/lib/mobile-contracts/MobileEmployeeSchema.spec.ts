// #region Imports

import { describe, expect, it } from 'vitest';
import { defaultAgentAppearance } from '@symphony/domain-team';
import { mobileEmployeeSchema } from './MobileEmployeeSchema';

// #endregion

describe('mobileEmployeeSchema', () => {
  it('accepts the actual default appearance of a newly configured employee', () => {
    // arrange
    const appearance = defaultAgentAppearance('employee-original');
    const employee = {
      id: 'employee-original',
      name: 'Ada',
      appearance,
      state: 'working',
      activeRole: 'analysis',
      workItemIds: ['work-item-1'],
    };

    // act
    const parsed = mobileEmployeeSchema.parse(employee);

    // assert
    expect(parsed.appearance).toEqual(appearance);
    expect(parsed.appearance?.figure).toBe('dot');
    expect(parsed.activeRole).toBe('analysis');
  });

  it('keeps a saved legacy appearance readable on Mobile', () => {
    // arrange
    const employee = {
      id: 'employee-legacy',
      name: 'Grace',
      appearance: { figure: 'kite', color: 'mint', accessories: ['glasses'] },
      state: 'idle',
      workItemIds: [],
    };

    // act
    const parsed = mobileEmployeeSchema.parse(employee);

    // assert
    expect(parsed).toEqual(employee);
  });

  it.each(['gold', 'rose'] as const)('retains the new %s employee identity on Mobile', (color) => {
    // arrange
    const employee = {
      id: 'employee-' + color,
      name: color === 'gold' ? 'Spark' : 'Loop',
      appearance: { figure: 'dot', color, accessories: [] },
      state: 'working',
      activeRole: 'implementation',
      workItemIds: ['work-item-1'],
    };

    // act
    const parsed = mobileEmployeeSchema.parse(employee);

    // assert
    expect(parsed.appearance).toEqual(employee.appearance);
    expect(parsed.activeRole).toBe('implementation');
  });
});
