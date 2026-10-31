// #region Imports

import { describe, expect, it } from 'vitest';
import { ChangeVariantPipe } from './ChangeVariantPipe';

// #endregion

describe('ChangeVariantPipe', () => {
  it('colours improvements success, declines danger and everything else neutral', () => {
    // arrange
    const pipe = new ChangeVariantPipe();

    // act
    const variants = [
      pipe.transform(3, 'higher'),
      pipe.transform(-12, 'higher'),
      pipe.transform(-0.8, 'lower'),
      pipe.transform(0.8, 'lower'),
      pipe.transform(4, 'none'),
      pipe.transform(0, 'higher'),
    ];

    // assert
    expect(variants).toEqual(['success', 'danger', 'success', 'danger', 'neutral', 'neutral']);
  });
});
