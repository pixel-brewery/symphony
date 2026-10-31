// #region Imports

import type { PullRequestState } from '@symphony/frontend-core/delivery';
import type { ICollectionListMenu, ICollectionListMenuOption } from '@symphony/frontend-ui';
import { describe, expect, it } from 'vitest';
import { type PullRequestBaseFilter, type PullRequestSort, resolvePullRequestListMenus } from './';

// #endregion

function menus(
  authors: readonly string[],
  selectedAuthor: string | undefined,
  sort: PullRequestSort,
  selectedState?: PullRequestState,
  selectedBase?: PullRequestBaseFilter,
): {
  stateMenu: ICollectionListMenu;
  baseMenu: ICollectionListMenu;
  authorMenu: ICollectionListMenu;
  sortMenu: ICollectionListMenu;
} {
  const [stateMenu, baseMenu, authorMenu, sortMenu] = resolvePullRequestListMenus(
    authors,
    selectedAuthor,
    selectedState,
    selectedBase,
    sort,
  );
  if (!stateMenu || !baseMenu || !authorMenu || !sortMenu) {
    throw new Error('expected a state, a base, an author and a sort menu');
  }
  return { stateMenu, baseMenu, authorMenu, sortMenu };
}

function optionAt(menu: ICollectionListMenu, index: number): ICollectionListMenuOption {
  const option = menu.options[index];
  if (!option) throw new Error(`expected menu option at index ${index}`);
  return option;
}

describe('resolvePullRequestListMenus', () => {
  it('offers Everyone plus every author, checking the current selection', () => {
    // act
    // arrange
    const { authorMenu } = menus(['alice', 'bob'], 'bob', 'updated-descending');

    // assert
    expect(authorMenu.label).toBe('Author');
    expect(authorMenu.subLabel).toBe('bob');
    expect(authorMenu.options.map((option) => option.label)).toEqual(['Everyone', 'alice', 'bob']);
    expect(authorMenu.options.map((option) => option.checked)).toEqual([false, false, true]);
  });

  it('labels the author menu neutrally and checks Everyone while no author is selected', () => {
    // act
    // arrange
    const { authorMenu } = menus(['alice'], undefined, 'updated-descending');

    // assert
    expect(authorMenu.label).toBe('Author');
    expect(authorMenu.subLabel).toBe('Everyone');
    expect(optionAt(authorMenu, 0)).toMatchObject({ label: 'Everyone', checked: true });
  });

  it('checks exactly the active sort order', () => {
    // arrange
    const { sortMenu } = menus([], undefined, 'created-ascending');

    // act
    const actual = sortMenu.options.map((option) => option.label);

    // assert
    expect(actual).toEqual(['Recently updated', 'Newest', 'Oldest']);
    expect(sortMenu.options.map((option) => option.checked)).toEqual([false, false, true]);
  });

  it('offers All states plus every state, checking the current selection', () => {
    // arrange
    const { stateMenu } = menus([], undefined, 'updated-descending', 'draft');

    // act
    const labels = stateMenu.options.map((option) => option.label);

    // assert
    expect(stateMenu.label).toBe('State');
    expect(stateMenu.subLabel).toBe('Draft');
    expect(labels).toEqual(['All states', 'Open', 'Draft', 'Merged', 'Closed']);
    expect(stateMenu.options.map((option) => option.checked)).toEqual([
      false,
      false,
      true,
      false,
      false,
    ]);
  });

  it('offers All plus every base-branch filter, checking the current selection', () => {
    // arrange
    const { baseMenu } = menus([], undefined, 'updated-descending', undefined, 'conflicting');

    // act
    const labels = baseMenu.options.map((option) => option.label);

    // assert
    expect(baseMenu.label).toBe('Base');
    expect(baseMenu.subLabel).toBe('Conflicting');
    expect(labels).toEqual(['All', 'Behind', 'Conflicting']);
    expect(baseMenu.options.map((option) => option.checked)).toEqual([false, false, true]);
  });

  it('labels the base menu neutrally and checks All while no base filter is selected', () => {
    // arrange
    const { baseMenu } = menus([], undefined, 'updated-descending');

    // act
    const allOption = optionAt(baseMenu, 0);

    // assert
    expect(baseMenu.label).toBe('Base');
    expect(baseMenu.subLabel).toBe('All');
    expect(allOption).toMatchObject({ label: 'All', checked: true });
  });

  it('keeps an author named like the Everyone option distinguishable from it', () => {
    // arrange
    const { authorMenu } = menus(['everyone'], undefined, 'updated-descending');

    // act
    const optionIds = authorMenu.options.map((option) => option.id);
    // assert
    expect(new Set(optionIds).size).toBe(optionIds.length);
  });
});
