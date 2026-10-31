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

  it('accepts Settings with up to eight bounded location parameters', () => {
    // arrange
    const eightParameters = Array.from(
      { length: 8 },
      (_, index) => `key${String.fromCharCode(97 + index)}=value`,
    ).join('&');
    const paths = [
      '/settings',
      '/settings?section=skills',
      '/settings?workspace=4f1c2b9e-7d3a-4e8b-9c1d-2a3b4c5d6e7f',
      '/settings?workspace=flamox365&section=repositories&repository=repo_1.main',
      '/settings?section=delivery&target=production~eu',
      `/settings?${eightParameters}`,
    ];

    // act
    const accepted = paths.filter((path) => isDesktopNavigationPath(path));

    // assert
    expect(accepted).toEqual(paths);
  });

  it('rejects unknown routes, malformed or excess parameters, encoded values and non-strings', () => {
    // arrange
    const nineParameters = Array.from(
      { length: 9 },
      (_, index) => `key${String.fromCharCode(97 + index)}=value`,
    ).join('&');
    const values: unknown[] = [
      '/main/settings',
      '/main/board',
      '/main/board?create=work-item',
      '/main/home?notifications=closed',
      'https://example.com/main/home',
      '/settings/../main/home',
      '/settings?',
      '/settings?section=',
      '/settings?Section=skills',
      '/settings?section=skills&',
      '/settings?section=skills#fragment',
      '/settings?workspace=a%2Fb',
      '/settings?workspace=a b',
      `/settings?workspace=${'w'.repeat(201)}`,
      `/settings?${nineParameters}`,
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
