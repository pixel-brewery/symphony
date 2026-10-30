// #region Imports

import { describe, expect, it } from 'vitest';
import { skillFlowRoleFromEvent } from './skillFlowRoleFromEvent';

// #endregion

describe('skillFlowRoleFromEvent', () => {
  it('reads the flow role of the item a select reports as selected', () => {
    // act
    const actual = skillFlowRoleFromEvent({ oldValue: null, newValue: { value: 'analysis' } });

    // assert
    expect(actual).toBe('analysis');
  });
});
