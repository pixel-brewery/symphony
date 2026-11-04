// #region Imports

import { afterEach, describe, expect, it, vi } from 'vitest';
import { LabelLocalizationBinding } from './LabelLocalizationBinding';

// #endregion

describe('LabelLocalizationBinding', () => {
  let dispose: (() => void) | undefined;

  afterEach(() => dispose?.());

  it('cannot clear a newer application when an older binding is disposed', () => {
    // arrange
    const first = { translate: vi.fn(() => 'First') };
    const second = { translate: vi.fn(() => 'Second') };
    const disposeFirst = LabelLocalizationBinding.bind(first);
    dispose = LabelLocalizationBinding.bind(second);

    // act
    disposeFirst();

    // assert
    expect(LabelLocalizationBinding.current).toBe(second);
  });
});
