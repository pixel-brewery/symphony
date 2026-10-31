// @vitest-environment jsdom

// #region Imports

import { inject, InjectionToken } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { Router } from '@angular/router';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import type { ISearchProvider } from '../models/ISearchProvider';
import { SearchManager } from '../services/SearchManager';
import { provideSearch } from './provideSearch';
import { withSearchProviders } from './withSearchProviders';

// #endregion

const SEARCH_PATH = new InjectionToken<string>('test-search-path');

class RegisteredSearchProvider implements ISearchProvider {
  // #region Fields

  private readonly _path = inject(SEARCH_PATH);

  // #endregion

  // #region Properties

  /** Test provider identity. @public @readonly */
  public readonly id = 'registered.search';
  /** Test provider priority. @public @readonly */
  public readonly order = 10;
  /** DI-resolved feature route phrase. @public @readonly */
  public readonly aliases = [{ term: 'registered', path: this._path, order: 0 }];

  // #endregion
}

describe('provideSearch', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('resolves actual feature providers through DI and uses only included contributions', async () => {
    // arrange
    const navigateByUrl = vi.fn(async () => true);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { url: '/main/home', navigateByUrl } },
        { provide: SEARCH_PATH, useValue: '/main/registered' },
        provideSearch(
          withSearchProviders({ id: 'registered-search', providers: [RegisteredSearchProvider] }),
        ),
      ],
    });

    // act
    await TestBed.inject(SearchManager).search('Registered');

    // assert
    expect(navigateByUrl).toHaveBeenCalledExactlyOnceWith('/main/registered');
  });

  it('keeps an empty contribution set valid without inventing built-in feature routes', async () => {
    // arrange
    const navigateByUrl = vi.fn(async () => true);
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: { url: '/main/home', navigateByUrl } },
        provideSearch(),
      ],
    });

    // act
    await TestBed.inject(SearchManager).search('board');

    // assert
    expect(navigateByUrl).not.toHaveBeenCalled();
  });
});
