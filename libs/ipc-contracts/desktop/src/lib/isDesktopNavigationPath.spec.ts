// #region Imports

import { describe, expect, it } from 'vitest';
import { isDesktopNavigationPath } from './isDesktopNavigationPath';

// #endregion

describe('isDesktopNavigationPath', () => {
  it('accepts the fixed main-window destinations', () => {
    // arrange
    const paths = [
      '/main/home',
      '/main/inbox',
      '/main/actions',
      '/main/board?create=true',
      '/main/home?notifications=open',
    ];

    // act
    const accepted = paths.filter((path) => isDesktopNavigationPath(path));

    // assert
    expect(accepted).toEqual(paths);
  });

  it('accepts the main-window Settings route with up to eight bounded location parameters', () => {
    // arrange
    const eightParameters = Array.from(
      { length: 8 },
      (_, index) => `key${String.fromCharCode(97 + index)}=value`,
    ).join('&');
    const paths = [
      '/main/settings',
      '/main/settings?section=skills',
      '/main/settings?workspace=4f1c2b9e-7d3a-4e8b-9c1d-2a3b4c5d6e7f',
      '/main/settings?workspace=flamox365&section=team',
      '/main/settings?workspace=flamox365&section=repositories&repository=repo_1.main',
      '/main/settings?section=delivery&target=production~eu',
      `/main/settings?${eightParameters}`,
    ];

    // act
    const accepted = paths.filter((path) => isDesktopNavigationPath(path));

    // assert
    expect(accepted).toEqual(paths);
  });

  it('rejects the retired Settings window route', () => {
    // arrange
    const values = [
      '/settings',
      '/settings?section=skills',
      '/settings?workspace=flamox365&section=team',
      '#/settings',
      'settings',
    ];

    // act
    const accepted = values.filter((value) => isDesktopNavigationPath(value));

    // assert
    expect(accepted).toEqual([]);
  });

  it('rejects unknown routes, malformed or excess parameters, encoded values and non-strings', () => {
    // arrange
    const nineParameters = Array.from(
      { length: 9 },
      (_, index) => `key${String.fromCharCode(97 + index)}=value`,
    ).join('&');
    const values: unknown[] = [
      '/main/board',
      '/main/board?create=work-item',
      '/main/home?notifications=closed',
      'https://example.com/main/home',
      'https://example.com/main/settings',
      '/main/settings/',
      '/main/settings/team',
      '/main/settingsx',
      '/main/settings/../home',
      '/main/settings?',
      '/main/settings?section=',
      '/main/settings?Section=skills',
      '/main/settings?section=skills&',
      '/main/settings?section=skills#fragment',
      '/main/settings?workspace=a%2Fb',
      '/main/settings?workspace=a b',
      `/main/settings?workspace=${'w'.repeat(201)}`,
      `/main/settings?${nineParameters}`,
      ' /main/settings',
      '/main/settings\n',
      undefined,
      42,
      { path: '/main/home' },
    ];

    // act
    const accepted = values.filter((value) => isDesktopNavigationPath(value));

    // assert
    expect(accepted).toEqual([]);
  });
});
