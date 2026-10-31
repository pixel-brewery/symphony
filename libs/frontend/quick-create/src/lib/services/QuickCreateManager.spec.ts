// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { describe, expect, it, vi } from 'vitest';
import type { IQuickCreateItem } from '../models/IQuickCreateItem';
import { QuickCreateManager } from './QuickCreateManager';

// #endregion

describe('QuickCreateManager', () => {
  it('retains disabled actions and resolves current availability without a second state owner', () => {
    // arrange
    const enabled = signal(false);
    const manager = new QuickCreateManager({ navigate: vi.fn() }, [
      { getItems: () => [{ ...item(), disabled: !enabled() }] },
    ]);

    // act
    const disabled = manager.getItemForNavigation('board');
    enabled.set(true);
    const available = manager.getItemForNavigation('board');

    // assert
    expect(disabled?.disabled).toBe(true);
    expect(available?.disabled).toBe(false);
    expect(manager.getItemForNavigation('unregistered')).toBeUndefined();
  });

  it.each(['/main/board', '/main/pull-requests'])(
    'retains the owning route authoring intent for %s',
    async (route) => {
      // arrange
      const navigate = vi.fn(async () => true);
      const manager = new QuickCreateManager({ navigate }, null);

      // act
      await manager.create(route);

      // assert
      expect(navigate).toHaveBeenCalledExactlyOnceWith([route], {
        queryParams: { create: 'true' },
      });
    },
  );

  it('rejects duplicate item and navigation identities before resolving an ambiguous action', () => {
    // arrange
    const duplicateId = new QuickCreateManager({ navigate: vi.fn() }, [
      { getItems: () => [item(), item()] },
    ]);
    const duplicateNavigation = new QuickCreateManager({ navigate: vi.fn() }, [
      { getItems: () => [item(), { ...item(), id: 'second' }] },
    ]);

    // act
    const resolveId = () => duplicateId.items;
    const resolveNavigation = () => duplicateNavigation.getItemForNavigation('board');

    // assert
    expect(resolveId).toThrow('Duplicate quick-create item id');
    expect(resolveNavigation).toThrow('Duplicate quick-create navigation registration');
  });

  it('keeps an empty product contribution set valid', () => {
    // arrange
    const manager = new QuickCreateManager({ navigate: vi.fn() }, null);

    // act
    const actions = manager.items;

    // assert
    expect(actions).toEqual([]);
  });
});

function item(): IQuickCreateItem {
  return {
    id: 'work.create',
    navigationItemKey: 'board',
    label: 'New work item',
    testId: 'home-create-work-item',
    route: '/main/board',
    disabled: false,
    tooltip: 'Create a work item on the selected board.',
  };
}
