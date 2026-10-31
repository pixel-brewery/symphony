// #region Imports

import type { ICollectionListMenu, ICollectionListMenuOption } from '@symphony/frontend-ui';
import type { ICiRun } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import { type ActionsRunSort, resolveActionsListMenus } from './';

// #endregion

function menus(
  actors: readonly string[],
  selectedActor: string | undefined,
  selectedStatus: ICiRun['status'] | undefined,
  sort: ActionsRunSort,
): {
  statusMenu: ICollectionListMenu;
  actorMenu: ICollectionListMenu;
  sortMenu: ICollectionListMenu;
} {
  const [statusMenu, actorMenu, sortMenu] = resolveActionsListMenus(
    actors,
    selectedActor,
    selectedStatus,
    sort,
  );
  if (!statusMenu || !actorMenu || !sortMenu) {
    throw new Error('expected a status, an actor, and a sort menu');
  }
  return { statusMenu, actorMenu, sortMenu };
}

function optionAt(menu: ICollectionListMenu, index: number): ICollectionListMenuOption {
  const option = menu.options[index];
  if (!option) throw new Error(`expected menu option at index ${index}`);
  return option;
}

describe('resolveActionsListMenus', () => {
  it('offers All statuses plus every run status, checking the current selection', () => {
    // act
    // arrange
    const { statusMenu } = menus([], undefined, 'failed', 'started-descending');

    // assert
    expect(statusMenu.label).toBe('Status');
    expect(statusMenu.subLabel).toBe('Failed');
    expect(statusMenu.options.map((option) => option.label)).toEqual([
      'All statuses',
      'Queued',
      'In progress',
      'Succeeded',
      'Failed',
      'Cancelled',
    ]);
    expect(statusMenu.options.map((option) => option.checked)).toEqual([
      false,
      false,
      false,
      false,
      true,
      false,
    ]);
  });

  it('labels the menus neutrally and checks the defaults while nothing is selected', () => {
    // act
    // arrange
    const { statusMenu, actorMenu } = menus(['alice'], undefined, undefined, 'started-descending');

    // assert
    expect(statusMenu.label).toBe('Status');
    expect(statusMenu.subLabel).toBe('All statuses');
    expect(optionAt(statusMenu, 0)).toMatchObject({ label: 'All statuses', checked: true });
    expect(actorMenu.label).toBe('Author');
    expect(actorMenu.subLabel).toBe('Everyone');
    expect(optionAt(actorMenu, 0)).toMatchObject({ label: 'Everyone', checked: true });
  });

  it('offers Everyone plus every actor, checking the current selection', () => {
    // act
    // arrange
    const { actorMenu } = menus(['alice', 'bob'], 'bob', undefined, 'started-descending');

    // assert
    expect(actorMenu.label).toBe('Author');
    expect(actorMenu.subLabel).toBe('bob');
    expect(actorMenu.options.map((option) => option.label)).toEqual(['Everyone', 'alice', 'bob']);
    expect(actorMenu.options.map((option) => option.checked)).toEqual([false, false, true]);
  });

  it('checks exactly the active sort order', () => {
    // arrange
    const { sortMenu } = menus([], undefined, undefined, 'started-ascending');

    // act
    const actual = sortMenu.options.map((option) => option.label);

    // assert
    expect(actual).toEqual(['Newest', 'Oldest']);
    expect(sortMenu.options.map((option) => option.checked)).toEqual([false, true]);
  });

  it('keeps an actor named like the Everyone option distinguishable from it', () => {
    // arrange
    const { actorMenu } = menus(['everyone'], undefined, undefined, 'started-descending');

    // act
    const optionIds = actorMenu.options.map((option) => option.id);
    // assert
    expect(new Set(optionIds).size).toBe(optionIds.length);
  });
});
