// #region Imports

import type { INavigationItem } from '@symphony/frontend-core';
import { describe, expect, it } from 'vitest';
import { projectNavigationPaletteResults } from './projectNavigationPaletteResults';

// #endregion

describe('projectNavigationPaletteResults', () => {
  it('lists Settings and every sidebar destination in sidebar order for an empty query', () => {
    // arrange
    const items = [destination('home', 'Overview', '/main/home'), destination('board', 'Board')];

    // act
    const results = projectNavigationPaletteResults(items, '');

    // assert
    expect(results.map((result) => [result.title, result.shortcut, result.action])).toEqual([
      ['Settings…', ',', { kind: 'navigate', path: '/main/settings' }],
      ['Go to Overview', undefined, { kind: 'navigate', path: '/main/home' }],
      ['Go to Board', undefined, { kind: 'navigate', path: '/main/board' }],
    ]);
  });

  it('keeps only matching destinations and finds Settings by its sections', () => {
    // arrange
    const items = [destination('home', 'Overview', '/main/home'), destination('board', 'Board')];

    // act
    const board = projectNavigationPaletteResults(items, 'boa');
    const skills = projectNavigationPaletteResults(items, 'skills');

    // assert
    expect(board.map((result) => result.title)).toEqual(['Go to Board']);
    expect(board[0]?.rank).toBeGreaterThan(0);
    expect(skills.map((result) => result.title)).toEqual(['Settings…']);
  });
});

function destination(key: string, label: string, route = `/main/${key}`): INavigationItem {
  return { key, label, icon: 'board', route, order: 0, region: 'desktop-main' };
}
