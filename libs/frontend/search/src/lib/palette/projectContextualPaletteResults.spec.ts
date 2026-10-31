// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { projectContextualPaletteResults } from './projectContextualPaletteResults';

// #endregion

describe('projectContextualPaletteResults', () => {
  it('offers to filter the current screen by the typed text through the existing search', async () => {
    // arrange
    const search = vi.fn(async () => undefined);

    // act
    const [filter] = projectContextualPaletteResults({
      contextual: true,
      screenLabel: 'Board',
      activeFilter: '',
      query: 'restore',
      search,
    });
    if (filter?.action.kind === 'execute') await filter.action.execute();

    // assert
    expect(filter?.title).toBe('Filter Board by “restore”');
    expect(filter?.group).toBe('commands');
    expect(search).toHaveBeenCalledExactlyOnceWith('restore');
  });

  it('offers to clear an active filter when nothing is typed', async () => {
    // arrange
    const search = vi.fn(async () => undefined);

    // act
    const [clear] = projectContextualPaletteResults({
      contextual: true,
      screenLabel: 'Pull requests',
      activeFilter: 'release',
      query: '',
      search,
    });
    if (clear?.action.kind === 'execute') await clear.action.execute();

    // assert
    expect(clear?.title).toBe('Clear the Pull requests filter');
    expect(clear?.facts).toEqual(['Filtered by “release”']);
    expect(search).toHaveBeenCalledExactlyOnceWith('');
  });

  it('offers nothing outside a contextual screen or without a filter to clear', () => {
    // arrange
    const search = vi.fn(async () => undefined);

    // act
    const elsewhere = projectContextualPaletteResults({
      contextual: false,
      screenLabel: 'Overview',
      activeFilter: '',
      query: 'restore',
      search,
    });
    const unfiltered = projectContextualPaletteResults({
      contextual: true,
      screenLabel: 'Board',
      activeFilter: '',
      query: '',
      search,
    });

    // assert
    expect(elsewhere).toEqual([]);
    expect(unfiltered).toEqual([]);
  });
});
