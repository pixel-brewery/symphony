// #region Imports

import { describe, expect, it } from 'vitest';
import type { IPullRequestComparisonCommit } from '@symphony/domain-delivery';
import { proposePullRequestTitle } from './';

// #endregion

describe('proposePullRequestTitle', () => {
  it('uses the subject of the only commit in the range', () => {
    // act
    const actual = proposePullRequestTitle('feature/mobile-companion', [
      commit('Add the pairing screen'),
    ]);

    // assert
    expect(actual).toBe('Add the pairing screen');
  });

  it('falls back to the readable branch name for several commits', () => {
    // act
    const actual = proposePullRequestTitle('feature/mobile-companion', [
      commit('First'),
      commit('Second'),
    ]);

    // assert
    expect(actual).toBe('Feature/mobile companion');
  });

  it('falls back to the branch name when the only commit has an empty subject', () => {
    // act
    const actual = proposePullRequestTitle('fix/drawer', [commit('   ')]);

    // assert
    expect(actual).toBe('Fix/drawer');
  });
});

function commit(title: string): IPullRequestComparisonCommit {
  return { revision: `revision-${title}`, title };
}
