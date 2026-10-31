// @vitest-environment jsdom

// #region Imports

import { inject, InjectionToken, signal, type Signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { INavigationItem } from './INavigationItem';
import { NavigationRegistry } from './NavigationRegistry';
import { provideNavigation } from './provideNavigation';
import { provideNavigationItems } from './provideNavigationItems';
import { withNavigationItems } from './withNavigationItems';

// #endregion

function destination(key: string, order: number, region = 'desktop-main'): INavigationItem {
  return { key, label: key, icon: 'home', route: `/main/${key}`, order, region };
}

describe('NavigationRegistry', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('provides an empty navigation surface when no features are included', () => {
    // arrange
    TestBed.configureTestingModule({ providers: [provideNavigation()] });

    // act
    const items = TestBed.inject(NavigationRegistry).byRegion('desktop-main')();

    // assert
    expect(items).toEqual([]);
  });

  it('orders contributed destinations by position and then stable key within their region', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        provideNavigation(
          withNavigationItems({
            id: 'delivery-navigation',
            items: [destination('pull-requests', 30), destination('actions', 30)],
          }),
          withNavigationItems({
            id: 'work-navigation',
            items: destination('board', 20),
          }),
        ),
        provideNavigationItems(destination('mobile-home', 10, 'mobile-main')),
      ],
    });

    // act
    const items = TestBed.inject(NavigationRegistry).byRegion('desktop-main')();

    // assert
    expect(items.map((item) => item.key)).toEqual(['board', 'actions', 'pull-requests']);
  });

  it('preserves direct Mobile registrations alongside typed feature contributions', () => {
    // arrange
    TestBed.configureTestingModule({
      providers: [
        provideNavigationItems([
          destination('settings', 40, 'mobile-main'),
          destination('home', 10, 'mobile-main'),
        ]),
        provideNavigation(
          withNavigationItems({
            id: 'mobile-work-navigation',
            items: destination('board', 20, 'mobile-main'),
          }),
          withNavigationItems({
            id: 'desktop-work-navigation',
            items: destination('board', 20),
          }),
        ),
      ],
    });

    // act
    const items = TestBed.inject(NavigationRegistry).byRegion('mobile-main')();

    // assert
    expect(items.map((item) => item.key)).toEqual(['home', 'board', 'settings']);
  });

  it('omits destinations belonging to a feature that the product did not register', () => {
    // arrange
    const work = withNavigationItems({ id: 'work-navigation', items: destination('board', 20) });
    const optionalArcade = withNavigationItems({
      id: 'arcade-navigation',
      items: destination('arcade', 70),
    });
    const includedFeatures = [work, optionalArcade].filter(
      (feature) => feature.id !== 'arcade-navigation',
    );
    TestBed.configureTestingModule({ providers: [provideNavigation(...includedFeatures)] });

    // act
    const items = TestBed.inject(NavigationRegistry).byRegion('desktop-main')();

    // assert
    expect(items.map((item) => item.key)).toEqual(['board']);
  });

  it('reacts to an included feature visibility preference without rebuilding registrations', () => {
    // arrange
    const arcadeEnabled = signal(false);
    const arcadePreference = new InjectionToken<Signal<boolean>>('arcade-preference');
    TestBed.configureTestingModule({
      providers: [
        { provide: arcadePreference, useValue: arcadeEnabled },
        provideNavigation(
          withNavigationItems({
            id: 'work-navigation',
            items: destination('board', 20),
          }),
          withNavigationItems({
            id: 'arcade-navigation',
            items: () => {
              const preference = inject(arcadePreference);
              return { ...destination('arcade', 70), isVisible: () => preference() };
            },
          }),
        ),
      ],
    });
    const items = TestBed.inject(NavigationRegistry).byRegion('desktop-main');
    const initiallyVisible = items().map((item) => item.key);

    // act
    arcadeEnabled.set(true);
    const enabledItems = items().map((item) => item.key);
    arcadeEnabled.set(false);

    // assert
    expect(initiallyVisible).toEqual(['board']);
    expect(enabledItems).toEqual(['board', 'arcade']);
    expect(items().map((item) => item.key)).toEqual(['board']);
  });
});
