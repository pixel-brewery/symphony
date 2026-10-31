// #region Imports

import { describe, expect, it } from 'vitest';
import type { IActionRunRow } from './IActionRunRow';
import { matchesActionRunFilter } from './matchesActionRunFilter';

// #endregion

const row: IActionRunRow = {
  id: 'ci:1',
  workflowName: 'PR Quality',
  status: 'failed',
  runner: 'github',
  branch: 'codex/cr-0589',
  actor: 'octocat',
  runningLocally: false,
};

describe('matchesActionRunFilter', () => {
  it('narrows by status, author and search text', () => {
    // act
    const results = [
      matchesActionRunFilter(row, { query: '' }),
      matchesActionRunFilter(row, { status: 'failed', actor: 'octocat', query: 'cr-0589' }),
      matchesActionRunFilter(row, { status: 'succeeded', query: '' }),
      matchesActionRunFilter(row, { actor: 'someone', query: '' }),
      matchesActionRunFilter(row, { query: 'deploy' }),
    ];

    // assert
    expect(results).toEqual([true, true, false, false, false]);
  });
});
