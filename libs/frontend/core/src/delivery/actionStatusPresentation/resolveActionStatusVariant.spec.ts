// #region Imports

import { describe, expect, it } from 'vitest';
import { resolveActionStatusVariant } from './';

// #endregion

describe('resolveActionStatusVariant', () => {
  it('renders in-progress with the blue info variant', () => {
    // arrange
    const status = 'in-progress';
    // act
    const actual = resolveActionStatusVariant(status);

    // assert
    expect(actual).toBe('info');
  });

  it.each([
    ['succeeded', 'success'],
    ['failed', 'danger'],
    ['cancelled', 'neutral'],
    ['queued', 'neutral'],
  ] as const)('keeps terminal status %s semantic', (status, variant) => {
    // act
    const actual = resolveActionStatusVariant(status);

    // assert
    expect(actual).toBe(variant);
  });
});
