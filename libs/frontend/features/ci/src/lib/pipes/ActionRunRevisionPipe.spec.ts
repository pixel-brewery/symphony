// #region Imports

import { describe, expect, it } from 'vitest';
import { ActionRunRevisionPipe } from './ActionRunRevisionPipe';

// #endregion

describe('ActionRunRevisionPipe', () => {
  it('joins branch, short commit and trigger', () => {
    // arrange
    const pipe = new ActionRunRevisionPipe();

    // act
    const lines = [
      pipe.transform({
        branch: 'dev',
        revision: '4f2a91c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6',
        event: 'push',
      }),
      pipe.transform({ branch: 'main', event: 'workflow_dispatch' }),
      pipe.transform({ revision: 'simulated-1' }),
      pipe.transform({}),
    ];

    // assert
    expect(lines).toEqual(['dev · 4f2a91c · push', 'main · manual', 'simulated-1', '—']);
  });
});
