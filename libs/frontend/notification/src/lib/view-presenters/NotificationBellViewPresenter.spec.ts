// @vitest-environment jsdom

// #region Imports

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { provideRouter, Router } from '@angular/router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { INotificationItem } from '../models/INotificationItem';
import { NOTIFICATION_SOURCES } from '../provider/NotificationSources';
import { NotificationCentre } from '../state/NotificationCentre';
import { NotificationHistory } from '../state/NotificationHistory';
import { NotificationBellViewPresenter } from './NotificationBellViewPresenter';

// #endregion

@Component({ template: '' })
class EmptyRouteView {}

const ITEM: INotificationItem = {
  id: 'developer-tools:codex',
  severity: 'error',
  title: 'Codex CLI is not installed',
  location: ['System', 'Developer tools'],
  scope: { kind: 'mac' },
  actions: [{ id: 'install', label: 'Install with Homebrew', emphasis: 'primary' }],
};

function arrange() {
  const source = {
    items: signal<readonly INotificationItem[]>([ITEM]).asReadonly(),
    refresh: vi.fn(async () => undefined),
    connect: vi.fn(),
    perform: vi.fn(async () => undefined),
  };
  TestBed.configureTestingModule({
    providers: [
      provideRouter([{ path: 'main/home', component: EmptyRouteView }]),
      NotificationHistory,
      NotificationCentre,
      NotificationBellViewPresenter,
      { provide: NOTIFICATION_SOURCES, useValue: source, multi: true },
    ],
  });
  return {
    presenter: TestBed.inject(NotificationBellViewPresenter),
    router: TestBed.inject(Router),
    source,
  };
}

describe('NotificationBellViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('connects the sources once and reloads them when the popover opens', () => {
    // arrange
    const { presenter, source } = arrange();
    // act
    presenter.centre.toggle();
    // assert
    expect(source.connect).toHaveBeenCalledOnce();
    expect(source.refresh).toHaveBeenCalledOnce();
    expect(presenter.isOpen()).toBe(true);
    presenter.centre.toggle();
    expect(presenter.isOpen()).toBe(false);
  });

  it('opens for ?notifications=open and removes only that parameter from the URL', async () => {
    // arrange
    const { presenter, router } = arrange();
    // act
    await router.navigateByUrl('/main/home?notifications=open&view=today');
    await vi.waitFor(() => expect(router.url).toBe('/main/home?view=today'));
    // assert
    expect(presenter.isOpen()).toBe(true);
  });

  it('closes the popover and performs the fix through the centre', async () => {
    // arrange
    const { presenter, source } = arrange();
    presenter.centre.open();
    // act
    await presenter.centre.perform(ITEM.id, 'install');
    // assert
    expect(presenter.isOpen()).toBe(false);
    expect(source.perform).toHaveBeenCalledExactlyOnceWith(ITEM.id, 'install');
    expect(presenter.centre.readItemIds().has(ITEM.id)).toBe(true);
  });

  it('marks everything read and clears read notices', () => {
    // arrange
    const { presenter } = arrange();
    TestBed.inject(NotificationHistory).push({ kind: 'success', title: 'Saved.', content: '' });
    // act
    presenter.centre.markAllAsRead();
    presenter.centre.clearRead();
    // assert
    expect(presenter.centre.unreadCount()).toBe(0);
    expect(presenter.centre.notices()).toEqual([]);
  });
});
