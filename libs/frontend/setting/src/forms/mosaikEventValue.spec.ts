// #region Imports

import { describe, expect, it } from 'vitest';
import { mosaikEventValue } from './mosaikEventValue';

// #endregion

describe('mosaikEventValue', () => {
  it('reads native input text instead of the numeric UI event counter', () => {
    // arrange
    const event = { detail: 0, target: { value: 'Customer Claude account' } };

    // act
    const value = mosaikEventValue(event);

    // assert
    expect(value).toBe('Customer Claude account');
  });

  it('preserves the explicit value and selection payload priority over the element value', () => {
    // arrange
    const target = { value: 'previous' };

    // act
    const explicit = mosaikEventValue({ value: 'explicit', detail: { value: 'detail' }, target });
    const detail = mosaikEventValue({ detail: { value: 'detail' }, target });
    const selection = mosaikEventValue({ detail: { newValue: { value: 'selected' } }, target });

    // assert
    expect(explicit).toBe('explicit');
    expect(detail).toBe('detail');
    expect(selection).toBe('selected');
  });

  it('retains false and zero values and accepts a primitive custom detail without a target', () => {
    // arrange
    const unchecked = { detail: { value: false }, target: { value: true } };
    const cleared = { value: 0, target: { value: 10 } };

    // act
    const values = [
      mosaikEventValue(unchecked),
      mosaikEventValue(cleared),
      mosaikEventValue({ detail: 'custom' }),
    ];

    // assert
    expect(values).toEqual([false, 0, 'custom']);
  });
});
