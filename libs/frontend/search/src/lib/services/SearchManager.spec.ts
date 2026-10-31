// @vitest-environment jsdom

// #region Imports

import { describe, expect, it, vi } from 'vitest';
import type { ISearchProvider } from '../models/ISearchProvider';
import { SearchManager } from './SearchManager';

// #endregion

describe('SearchManager', () => {
  it.each(['/main/orbit', '/main/board', '/main/pull-requests', '/main/actions'])(
    'keeps search and clearing contextual on %s before aliases or data matching',
    async (path) => {
      // arrange
      const match = vi.fn(() => ({ path: '/main/other', queryParams: {} }));
      const router = createRouter(`${path}?selected=42&q=previous`);
      const manager = new SearchManager(router, [
        {
          id: 'contextual',
          order: 0,
          contextualPaths: [path],
          aliases: [{ term: 'board', path: '/main/board', order: 0 }],
          match,
        },
      ]);

      // act
      await manager.search('  Board  ');
      await manager.search('   ');

      // assert
      expect(router.navigate.mock.calls).toEqual([
        [[path], { queryParams: { q: 'Board' }, queryParamsHandling: 'merge' }],
        [[path], { queryParams: { q: null }, queryParamsHandling: 'merge' }],
      ]);
      expect(router.navigateByUrl).not.toHaveBeenCalled();
      expect(match).not.toHaveBeenCalled();
    },
  );

  it('resolves route aliases in their original global priority before data providers', async () => {
    // arrange
    const router = createRouter('/main/home');
    const match = vi.fn(() => ({ path: '/main/data', queryParams: {} }));
    const manager = new SearchManager(router, [
      {
        id: 'later',
        order: 0,
        aliases: [{ term: 'board', path: '/main/board', order: 3 }],
        match,
      },
      {
        id: 'earlier',
        order: 10,
        aliases: [{ term: 'home', path: '/main/home', order: 0 }],
      },
    ]);

    // act
    await manager.search('  O  ');

    // assert
    expect(router.navigateByUrl).toHaveBeenCalledExactlyOnceWith('/main/home');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(match).not.toHaveBeenCalled();
  });

  it('preserves alias containment direction instead of treating a longer query as a route', async () => {
    // arrange
    const router = createRouter('/main/home');
    const manager = new SearchManager(router, [
      {
        id: 'board',
        order: 10,
        aliases: [{ term: 'board', path: '/main/board', order: 3 }],
      },
    ]);

    // act
    await manager.search('board details');

    // assert
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it.each([
    [10, '/main/board', { q: 'Match' }],
    [20, '/main/pull-requests', { q: 'Match' }],
    [30, '/main/actions', { q: 'Match' }],
    [40, '/main/settings', { section: 'skills' }],
  ] as const)(
    'keeps data priority with the first available provider at %s',
    async (first, path, queryParams) => {
      // arrange
      const router = createRouter('/main/home');
      const checked: number[] = [];
      const providers: ISearchProvider[] = [
        { id: 'skills', order: 40 },
        { id: 'ci', order: 30 },
        { id: 'delivery', order: 20 },
        { id: 'work', order: 10 },
      ].map((provider) => ({
        ...provider,
        match: (query: string, normalizedQuery: string) => {
          checked.push(provider.order);
          expect(query).toBe('Match');
          expect(normalizedQuery).toBe('match');
          return provider.order >= first ? { path, queryParams } : undefined;
        },
      }));
      const manager = new SearchManager(router, providers);

      // act
      await manager.search('  Match  ');

      // assert
      expect(checked).toEqual([10, 20, 30, 40].filter((order) => order <= first));
      expect(router.navigate).toHaveBeenCalledExactlyOnceWith([path], { queryParams });
      expect(router.navigateByUrl).not.toHaveBeenCalled();
    },
  );

  it('keeps empty global queries, absent contributions and unmatched data on the current route', async () => {
    // arrange
    const router = createRouter('/main/home');
    const match = vi.fn(() => undefined);
    const manager = new SearchManager(router, [{ id: 'work', order: 10, match }]);

    // act
    await manager.search('   ');
    await manager.search('unmatched');
    await new SearchManager(router, null).search('unmatched');

    // assert
    expect(match).toHaveBeenCalledExactlyOnceWith('unmatched', 'unmatched');
    expect(router.navigate).not.toHaveBeenCalled();
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });
});

function createRouter(url: string) {
  return {
    url,
    navigate: vi.fn(async () => true),
    navigateByUrl: vi.fn(async () => true),
  };
}
