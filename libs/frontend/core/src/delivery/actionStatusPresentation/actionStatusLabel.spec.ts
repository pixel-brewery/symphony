// #region Imports

import { describe, expect, it } from 'vitest';
import { actionStatusLabel } from './';

// #endregion

describe('actionStatusLabel', () => {
  it('renders the in-progress status as a readable label', () => {
    // act
    const actual = actionStatusLabel('in-progress');

    // assert
    expect(actual).toBe('In progress');
  });
});
