// #region Imports

import type { PullRequestState } from '@symphony/frontend-core/delivery';
import type { ICollectionListMenu, ICollectionListMenuOption } from '@symphony/frontend-ui';
import { describe, expect, it } from 'vitest';
import {
  type PullRequestBaseFilter,
  type PullRequestSort,
  resolvePullRequestListCommand,
  resolvePullRequestListMenus,
} from './';

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

describe('resolvePullRequestListCommand', () => {
  it('maps an author option back to that author', () => {
    // arrange
    const { authorMenu } = menus(['alice'], undefined, 'updated-descending');

    // act
    const command = resolvePullRequestListCommand({
      menuId: authorMenu.id,
      optionId: optionAt(authorMenu, 1).id,
    });

    // assert
    expect(command).toEqual({ kind: 'author', author: 'alice' });
  });

  it('maps the Everyone option to an undefined author', () => {
    // arrange
    const { authorMenu } = menus(['alice'], 'alice', 'updated-descending');

    // act
    const command = resolvePullRequestListCommand({
      menuId: authorMenu.id,
      optionId: optionAt(authorMenu, 0).id,
    });

    // assert
    expect(command).toEqual({ kind: 'author', author: undefined });
  });

  it('maps a sort option to its sort order', () => {
    // arrange
    const { sortMenu } = menus([], undefined, 'updated-descending');

    // act
    const command = resolvePullRequestListCommand({
      menuId: sortMenu.id,
      optionId: optionAt(sortMenu, 1).id,
    });

    // assert
    expect(command).toEqual({ kind: 'sort', sort: 'created-descending' });
  });

  it('maps a state option to that state and All states to none', () => {
    // arrange
    const { stateMenu } = menus([], undefined, 'updated-descending');

    // act
    const command = resolvePullRequestListCommand({
      menuId: stateMenu.id,
      optionId: optionAt(stateMenu, 2).id,
    });

    // assert
    expect(command).toEqual({ kind: 'state', state: 'draft' });
    expect(
      resolvePullRequestListCommand({
        menuId: stateMenu.id,
        optionId: optionAt(stateMenu, 0).id,
      }),
    ).toEqual({ kind: 'state', state: undefined });
  });

  it('maps a base option to that base filter and All to none', () => {
    // arrange
    const { baseMenu } = menus([], undefined, 'updated-descending');

    // act
    const command = resolvePullRequestListCommand({
      menuId: baseMenu.id,
      optionId: optionAt(baseMenu, 1).id,
    });

    // assert
    expect(command).toEqual({ kind: 'base', base: 'behind' });
    expect(
      resolvePullRequestListCommand({
        menuId: baseMenu.id,
        optionId: optionAt(baseMenu, 0).id,
      }),
    ).toEqual({ kind: 'base', base: undefined });
  });

  it('rejects selections that name no known menu or sort order', () => {
    // act
    const actual = resolvePullRequestListCommand({ menuId: 'unknown', optionId: 'x' });

    // assert
    expect(actual).toBeUndefined();
    expect(resolvePullRequestListCommand({ menuId: 'sort', optionId: 'x' })).toBeUndefined();
  });
});
