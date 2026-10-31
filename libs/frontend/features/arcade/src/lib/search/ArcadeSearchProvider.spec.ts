// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { ArcadeSearchProvider } from './ArcadeSearchProvider';

// #endregion

describe('ArcadeSearchProvider', () => {
  it('offers games in the palette only while the Arcade preference is on', () => {
    // arrange
    const enabled = signal(false);
    const provider = new ArcadeSearchProvider({ enabled });

    // act
    const off = provider.paletteResults('pong', 'pong');
    enabled.set(true);
    const on = provider.paletteResults('pong', 'pong');

    // assert
    expect(off).toEqual([]);
    expect(on.map((result) => result.title)).toEqual(['Play Pong']);
    expect(provider.aliases.map((alias) => alias.term)).toEqual(['arcade', 'pinball']);
  });
});
