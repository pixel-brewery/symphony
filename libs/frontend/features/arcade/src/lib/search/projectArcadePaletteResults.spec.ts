// @vitest-environment jsdom

// #region Imports

import { describe, expect, it } from 'vitest';
import { projectArcadePaletteResults } from './projectArcadePaletteResults';

// #endregion

describe('projectArcadePaletteResults', () => {
  it('offers to play the matching games while the Arcade is on', () => {
    // act
    const pitfall = projectArcadePaletteResults(true, 'pitfall');
    const games = projectArcadePaletteResults(true, 'arcade');

    // assert
    expect(pitfall.map((result) => [result.title, result.action])).toEqual([
      ['Play Pitfall!', { kind: 'navigate', path: '/main/arcade/pitfall' }],
      ['Play Pitfall II: Lost Caverns', { kind: 'navigate', path: '/main/arcade/pitfall-ii' }],
    ]);
    expect(games).toHaveLength(8);
    expect(games.every((result) => result.group === 'commands' && result.icon === 'games')).toBe(
      true,
    );
  });

  it('offers nothing while the Arcade is off or nothing is typed', () => {
    // act
    const off = projectArcadePaletteResults(false, 'pong');
    const opening = projectArcadePaletteResults(true, '');

    // assert
    expect(off).toEqual([]);
    expect(opening).toEqual([]);
  });
});
