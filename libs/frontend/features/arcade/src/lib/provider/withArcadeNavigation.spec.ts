// @vitest-environment jsdom

// #region Imports

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { NavigationRegistry, provideNavigation } from '@symphony/frontend-core/navigation';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { ARCADE_SETTINGS_CONTEXT } from '../settings/ArcadeSettingsContextToken';
import { withArcadeNavigation } from './withArcadeNavigation';

// #endregion

vi.mock('@symphony/frontend-core', async () => {
  const { withNavigationItems } = await vi.importActual<
    typeof import('@symphony/frontend-core/navigation')
  >('@symphony/frontend-core/navigation');
  return { withNavigationItems };
});

describe('withArcadeNavigation', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('follows the shared Arcade preference without writing settings or rebuilding registrations', () => {
    // arrange
    const enabled = signal(false);
    const setEnabled = vi.fn(async () => true);
    TestBed.configureTestingModule({
      providers: [
        { provide: ARCADE_SETTINGS_CONTEXT, useValue: { enabled, setEnabled } },
        provideNavigation(withArcadeNavigation(60)),
      ],
    });
    const items = TestBed.inject(NavigationRegistry).byRegion('desktop-main');
    const initiallyVisible = items();

    // act
    enabled.set(true);
    const enabledRoutes = items().map((item) => item.route);
    enabled.set(false);

    // assert
    expect(initiallyVisible).toEqual([]);
    expect(enabledRoutes).toEqual(['/main/arcade']);
    expect(items()).toEqual([]);
    expect(setEnabled).not.toHaveBeenCalled();
  });
});
