// @vitest-environment jsdom

// #region Imports

import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { HOME_CONTEXT } from '../ports/HomeContextToken';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { HomeViewPresenter } from './HomeViewPresenter';

// #endregion

describe('HomeViewPresenter', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterAll(() => TestBed.resetTestEnvironment());
  afterEach(() => TestBed.resetTestingModule());

  it('keeps the panorama loading state with the authoritative page snapshot', () => {
    // arrange
    const snapshot = signal<unknown>(undefined);
    TestBed.configureTestingModule({
      providers: [
        HomeViewPresenter,
        {
          provide: HOME_CONTEXT,
          useValue: {
            hasSnapshot: computed(() => Boolean(snapshot())),
            externalServiceIncident: signal(undefined),
          },
        },
      ],
    });
    const presenter = TestBed.inject(HomeViewPresenter);

    // act
    const loading = presenter.hasSnapshot();
    snapshot.set({});

    // assert
    expect(loading).toBe(false);
    expect(presenter.hasSnapshot()).toBe(true);
  });
});
