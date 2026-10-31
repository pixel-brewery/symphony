// #region Imports

import { describe, expect, it } from 'vitest';
import type { IPullRequestComparison } from '@symphony/domain-delivery';
import { resolvePullRequestComparisonPresentation } from './';

// #endregion

describe('resolvePullRequestComparisonPresentation', () => {
  it('reports a mergeable range with what it carries', () => {
    // act
    const actual = resolvePullRequestComparisonPresentation(
      comparison({ status: 'ahead', aheadBy: 1, changedFiles: 1 }),
    );

    // assert
    expect(actual).toEqual({
      variant: 'success',
      iconName: 'checkmark',
      header: 'Able to merge',
      detail: '1 commit and 1 changed file would enter main.',
      comparable: true,
    });
  });

  it('blocks identical branches', () => {
    // act
    // arrange
    const presentation = resolvePullRequestComparisonPresentation(
      comparison({ status: 'identical' }),
    );

    // assert
    expect(presentation.comparable).toBe(false);
    expect(presentation.detail).toBe('main and feature/drawer are identical.');
  });

  it('blocks a source branch that only lags behind the target', () => {
    // act
    // arrange
    const presentation = resolvePullRequestComparisonPresentation(
      comparison({ status: 'behind', behindBy: 3 }),
    );

    // assert
    expect(presentation.comparable).toBe(false);
    expect(presentation.detail).toBe(
      'feature/drawer is 3 commits behind main and carries nothing new.',
    );
  });

  it('warns about a diverged range but still allows the pull request', () => {
    // act
    // arrange
    const presentation = resolvePullRequestComparisonPresentation(
      comparison({ status: 'diverged', aheadBy: 2, behindBy: 4, changedFiles: 6 }),
    );

    // assert
    expect(presentation).toMatchObject({
      variant: 'warning',
      header: 'Both branches moved on',
      comparable: true,
    });
    expect(presentation.detail).toContain('main is 4 commits ahead as well');
  });

  it('prefers the existing pull request over any comparison detail', () => {
    // act
    // arrange
    const presentation = resolvePullRequestComparisonPresentation(
      comparison({
        status: 'ahead',
        aheadBy: 2,
        existingPullRequest: { number: 42, externalUrl: 'https://github.com/acme/app/pull/42' },
      }),
    );

    // assert
    expect(presentation.comparable).toBe(false);
    expect(presentation.header).toBe('A pull request already exists');
    expect(presentation.detail).toContain('#42');
  });
});

function comparison(overrides: Partial<IPullRequestComparison>): IPullRequestComparison {
  return {
    repositoryBindingId: 'repository-1',
    targetBranch: 'main',
    sourceBranch: 'feature/drawer',
    status: 'ahead',
    aheadBy: 0,
    behindBy: 0,
    changedFiles: 0,
    commits: [],
    ...overrides,
  };
}
