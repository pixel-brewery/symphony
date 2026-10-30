// #region Imports

import { describe, expect, it } from 'vitest';
import { resolveInitialBranchSelection } from './';

// #endregion

describe('resolveInitialBranchSelection', () => {
  it('starts on the default branch and the first other branch', () => {
    // act
    const actual = resolveInitialBranchSelection(
      [branch('develop'), branch('main'), branch('feature/x')],
      'main',
    );

    // assert
    expect(actual).toEqual({ targetBranch: 'main', sourceBranch: 'develop' });
  });

  it('falls back to the first branch when the default branch is missing', () => {
    // act
    const actual = resolveInitialBranchSelection([branch('develop'), branch('trunk')], 'main');

    // assert
    expect(actual).toEqual({ targetBranch: 'develop', sourceBranch: 'trunk' });
  });

  it('leaves the source empty when only one branch exists', () => {
    // act
    const actual = resolveInitialBranchSelection([branch('main')], 'main');

    // assert
    expect(actual).toEqual({ targetBranch: 'main', sourceBranch: '' });
  });
});

function branch(name: string) {
  return { name, protected: false };
}
