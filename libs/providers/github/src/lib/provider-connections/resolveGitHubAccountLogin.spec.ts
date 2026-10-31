// #region Imports

import { describe, expect, it } from 'vitest';
import { resolveGitHubAccountLogin } from './resolveGitHubAccountLogin';

// #endregion

describe('resolveGitHubAccountLogin', () => {
  it('resolves the GitHub CLI account without treating login casing as identity', () => {
    // act
    const actual = resolveGitHubAccountLogin(
      JSON.stringify({
        hosts: {
          'github.com': [
            { host: 'github.com', login: 'RueDeRennes', state: 'success', active: true },
          ],
        },
      }),
      'github.com',
      'ruederennes',
    );

    // assert
    expect(actual).toBe('RueDeRennes');
  });
});
