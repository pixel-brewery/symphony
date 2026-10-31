// #region Imports

import { TemplateRef } from '@angular/core';
import { describe, expect, it } from 'vitest';
import { WindowSidebar } from './WindowSidebar';

// #endregion

describe('WindowSidebar', () => {
  it('shows the newest registered navigation and returns to the destinations once it leaves', () => {
    // arrange
    const sidebar = new WindowSidebar();
    const settings = {};
    const successor = {};
    const settingsNavigation = {} as TemplateRef<unknown>;
    const successorNavigation = {} as TemplateRef<unknown>;

    // act
    sidebar.register(settings, settingsNavigation);
    sidebar.register(successor, successorNavigation);
    sidebar.unregister(settings);
    const afterLateDestroy = sidebar.content();
    sidebar.unregister(successor);

    // assert
    expect(afterLateDestroy).toBe(successorNavigation);
    expect(sidebar.content()).toBeUndefined();
    expect(sidebar.isReplaced()).toBe(false);
  });
});
