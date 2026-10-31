// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { NavigationRegistry, type INavigationItem } from '@symphony/frontend-core';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { IPaletteResult } from '../models/IPaletteResult';
import type { ISearchProvider } from '../models/ISearchProvider';
import { SEARCH_PROVIDERS } from '../provider/SearchProviders';
import { CommandPalette } from '../services/CommandPalette';
import { SearchManager } from '../services/SearchManager';
import { CommandPaletteViewPresenter } from './CommandPaletteViewPresenter';

// #endregion

describe('CommandPaletteViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('groups the feature rows as drawn and starts with the text the palette opened with', () => {
    // arrange
    const { presenter, paletteResults } = setup({ initialQuery: 'restore' });

    // act
    const sections = presenter.sections();

    // assert
    expect(paletteResults).toHaveBeenCalledWith('restore', 'restore');
    expect(presenter.query()).toBe('restore');
    expect(
      sections.map((section) => [section.group, section.results.map((result) => result.id)]),
    ).toEqual([
      ['work-items', ['work-item:589', 'work-item:594']],
      ['pull-requests', ['pull-request:712']],
      ['commands', ['command:contextual-filter']],
    ]);
    expect(presenter.selectedResult()?.id).toBe('work-item:589');
  });

  it('lists the commands with nothing typed: clearing the filter, feature commands, Settings, destinations', () => {
    // arrange
    const { presenter } = setup({ url: '/main/board?q=old' });

    // act
    const titles = presenter.results().map((result) => result.title);

    // assert
    expect(titles).toEqual([
      'Clear the Board filter',
      'New work item…',
      'Settings…',
      'Go to Overview',
      'Go to Board',
    ]);
  });

  it('moves the selection with wrap-around and starts again at the first row when typing', () => {
    // arrange
    const { presenter } = setup({ initialQuery: 'restore' });

    // act
    presenter.moveSelectionCommand.execute('previous');
    const wrapped = presenter.selectedResult()?.id;
    presenter.moveSelectionCommand.execute('next');
    presenter.moveSelectionCommand.execute('next');
    const second = presenter.selectedResult()?.id;
    presenter.updateQueryCommand.execute('restore test');
    const afterTyping = presenter.selectedIndex();

    // assert
    expect(wrapped).toBe('command:contextual-filter');
    expect(second).toBe('work-item:594');
    expect(afterTyping).toBe(0);
  });

  it('closes the palette and navigates to the selected row', () => {
    // arrange
    const { presenter, palette, router } = setup({ initialQuery: 'restore' });
    presenter.moveSelectionCommand.execute('next');

    // act
    presenter.openCommand.execute();

    // assert
    expect(palette.isOpen()).toBe(false);
    expect(router.navigate).toHaveBeenCalledExactlyOnceWith(['/main/board'], {
      queryParams: { item: '594' },
    });
  });

  it('runs a command row through its feature flow after closing', async () => {
    // arrange
    const { presenter, palette, search } = setup({ initialQuery: 'restore' });
    const filter = presenter.results().find((result) => result.id === 'command:contextual-filter');

    // act
    presenter.openCommand.execute(filter);
    await vi.waitFor(() => expect(search.search).toHaveBeenCalled());

    // assert
    expect(palette.isOpen()).toBe(false);
    expect(search.search).toHaveBeenCalledExactlyOnceWith('restore');
  });

  it('reports no results for text nothing matches and takes the field text from its events', () => {
    // arrange
    const { presenter } = setup({ url: '/main/home' });

    // act
    presenter.updateQueryCommand.execute(new CustomEvent('input', { detail: 'zzz' }));
    const noResults = presenter.hasNoResults();
    presenter.updateQueryCommand.execute({ unrelated: true });
    const unchanged = presenter.query();

    // assert
    expect(noResults).toBe(true);
    expect(unchanged).toBe('zzz');
    expect(presenter.selectedResult()).toBeUndefined();
  });

  it('closes without opening anything', () => {
    // arrange
    const { presenter, palette, router } = setup({ initialQuery: 'restore' });

    // act
    presenter.closeCommand.execute();
    presenter.openCommand.execute(undefined);

    // assert
    expect(palette.isOpen()).toBe(false);
    expect(router.navigate).not.toHaveBeenCalledWith(['/main/settings'], expect.anything());
  });
});

function setup(options: { readonly initialQuery?: string; readonly url?: string } = {}) {
  const router = { url: options.url ?? '/main/board', navigate: vi.fn(async () => true) };
  const search = { search: vi.fn(async () => undefined) };
  const destinations = signal<readonly INavigationItem[]>([
    {
      key: 'home',
      label: 'Overview',
      icon: 'homeOutline',
      route: '/main/home',
      order: 0,
      region: 'desktop-main',
    },
    {
      key: 'board',
      label: 'Board',
      icon: 'board',
      route: '/main/board',
      order: 1,
      region: 'desktop-main',
    },
  ]);
  const paletteResults = vi.fn((_query: string, normalizedQuery: string) =>
    normalizedQuery
      ? [
          workItem('594', 2),
          workItem('589', 5),
          {
            id: 'pull-request:712',
            group: 'pull-requests',
            icon: 'branch',
            title: 'Restore test runbook',
            rank: 3,
            action: { kind: 'navigate', path: '/main/pull-requests', queryParams: { q: '712' } },
          } satisfies IPaletteResult,
        ].filter((result) => result.title.toLocaleLowerCase().includes(normalizedQuery))
      : [
          {
            id: 'command:new-work-item',
            group: 'commands',
            icon: 'add',
            title: 'New work item…',
            rank: 0,
            action: { kind: 'navigate', path: '/main/board', queryParams: { create: 'true' } },
          } satisfies IPaletteResult,
        ],
  );
  const provider: ISearchProvider = {
    id: 'work.search',
    order: 10,
    contextualPaths: ['/main/board'],
    paletteResults,
  };
  TestBed.configureTestingModule({
    providers: [
      CommandPaletteViewPresenter,
      { provide: Router, useValue: router },
      { provide: SearchManager, useValue: search },
      { provide: SEARCH_PROVIDERS, useValue: [{ id: 'home.search', order: 0 }, provider] },
      { provide: NavigationRegistry, useValue: { byRegion: () => destinations } },
    ],
  });
  const palette = TestBed.inject(CommandPalette);
  palette.open(options.initialQuery ?? '');
  const presenter = TestBed.inject(CommandPaletteViewPresenter);
  return { presenter, palette, router, search, paletteResults };
}

function workItem(id: string, rank: number): IPaletteResult {
  return {
    id: `work-item:${id}`,
    group: 'work-items',
    icon: 'board',
    reference: `CR-0${id}`,
    title: `Restore item ${id}`,
    facts: ['TODO'],
    rank,
    action: { kind: 'navigate', path: '/main/board', queryParams: { item: id } },
  };
}
