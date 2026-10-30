// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { DeliveryQuickCreateSource } from './DeliveryQuickCreateSource';

// #endregion

describe('DeliveryQuickCreateSource', () => {
  it('retains the existing action, route and reactive disabled-state explanation', () => {
    // arrange
    const enabled = signal(false);
    const source = new DeliveryQuickCreateSource({ canCreatePullRequest: enabled });

    // act
    const disabled = source.getItems();
    enabled.set(true);
    const available = source.getItems();

    // assert
    expect(disabled).toEqual([
      {
        id: 'delivery.create',
        navigationItemKey: 'pull-requests',
        label: 'New pull request',
        testId: 'home-create-pull-request',
        route: '/main/pull-requests',
        disabled: true,
        tooltip: 'Bind a GitHub repository to open a pull request.',
      },
    ]);
    expect(available).toEqual([
      { ...disabled[0], disabled: false, tooltip: 'Open a pull request on a repository in scope.' },
    ]);
  });
});
