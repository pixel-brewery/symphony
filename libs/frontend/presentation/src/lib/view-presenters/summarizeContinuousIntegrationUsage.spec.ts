// #region Imports

import { describe, expect, it } from 'vitest';
import { summarizeContinuousIntegrationUsage } from './summarizeContinuousIntegrationUsage';

// #endregion

describe('summarizeContinuousIntegrationUsage', () => {
  it('deduplicates account-level reports and aggregates only exact allowances', () => {
    // arrange
    const exactReport = {
      repositoryBindingId: 'repository-1',
      account: { type: 'organization' as const, login: 'example' },
      period: { resetsAt: '2026-09-01T00:00:00.000Z' },
      minutes: { used: 2_500, included: 3_000, remaining: 500 },
    };

    // act
    const actual = summarizeContinuousIntegrationUsage(
      ['repository-1', 'repository-2'],
      [exactReport, { ...exactReport, repositoryBindingId: 'repository-2' }],
    );

    // assert
    expect(actual).toEqual({
      accountLabel: '@example',
      used: 2_500,
      included: 3_000,
      remaining: 500,
      remainingPercent: 17,
      resetsAt: '2026-09-01T00:00:00.000Z',
    });

    expect(
      summarizeContinuousIntegrationUsage(
        ['repository-1', 'repository-3'],
        [
          exactReport,
          {
            repositoryBindingId: 'repository-3',
            account: { type: 'organization', login: 'enterprise' },
            minutes: { used: 8_000 },
          },
        ],
      ),
    ).toEqual({
      accountLabel: '2 accounts',
      used: 10_500,
      resetsAt: '2026-09-01T00:00:00.000Z',
    });
  });

  it('does not invent a remaining allowance for errors or unrelated repositories', () => {
    // act
    const actual = summarizeContinuousIntegrationUsage(
      ['repository-1'],
      [
        {
          repositoryBindingId: 'repository-1',
          error: 'GitHub Actions usage could not be loaded.',
        },
        {
          repositoryBindingId: 'repository-2',
          account: { type: 'organization', login: 'unrelated' },
          minutes: { used: 3_000, included: 3_000, remaining: 0 },
        },
      ],
    );

    // assert
    expect(actual).toEqual({
      accountLabel: '1 configured repository',
      error: 'GitHub Actions usage could not be loaded.',
    });
  });
});
