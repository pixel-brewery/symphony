// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { WorkQuickCreateSource } from './WorkQuickCreateSource';

// #endregion

describe('WorkQuickCreateSource', () => {
  it('retains the existing action, route and reactive disabled-state explanation', () => {
    // arrange
    const enabled = signal(false);
    const source = new WorkQuickCreateSource({ canCreateWorkItem: enabled });

    // act
    const disabled = source.getItems();
    enabled.set(true);
    const available = source.getItems();

    // assert
    expect(disabled).toEqual([
      {
        id: 'work.create',
        navigationItemKey: 'board',
        label: 'New work item',
        testId: 'home-create-work-item',
        route: '/main/board',
        disabled: true,
        tooltip: 'Select one board to create a work item.',
      },
    ]);
    expect(available).toEqual([
      { ...disabled[0], disabled: false, tooltip: 'Create a work item on the selected board.' },
    ]);
  });
});
