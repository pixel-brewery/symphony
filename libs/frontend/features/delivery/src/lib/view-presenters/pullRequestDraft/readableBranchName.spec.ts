// #region Imports

import { describe, expect, it } from 'vitest';
import { readableBranchName } from './';

// #endregion

describe('readableBranchName', () => {
  it('turns separators into words and capitalizes the first letter', () => {
    // act
    const actual = readableBranchName('fix/pull_request-drawer');

    // assert
    expect(actual).toBe('Fix/pull request drawer');
  });

  it('keeps a branch that carries no separators', () => {
    // act
    const actual = readableBranchName('main');

    // assert
    expect(actual).toBe('Main');
  });
});
