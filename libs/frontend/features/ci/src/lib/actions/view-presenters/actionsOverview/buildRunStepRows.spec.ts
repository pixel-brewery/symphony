// #region Imports

import type { ICiRunJob } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import { buildRunStepRows } from './buildRunStepRows';

// #endregion

const deploy: ICiRunJob = {
  id: 'job:deploy',
  name: 'deploy',
  status: 'failed',
  steps: [
    { id: 'step:setup', name: 'Set up job', status: 'succeeded' },
    { id: 'step:smoke', name: 'Smoke tests', status: 'skipped' },
  ],
};

describe('buildRunStepRows', () => {
  it('lists the steps of a single job directly', () => {
    // act
    const rows = buildRunStepRows([deploy]);

    // assert
    expect(rows.map((row) => [row.kind, row.name, row.nested])).toEqual([
      ['step', 'Set up job', false],
      ['step', 'Smoke tests', false],
    ]);
  });

  it('heads the steps of several jobs with their job and keeps step-less jobs', () => {
    // act
    const rows = buildRunStepRows([
      deploy,
      { id: 'job:verify', name: 'verify', status: 'succeeded', steps: [] },
    ]);

    // assert
    expect(rows.map((row) => [row.kind, row.name, row.nested])).toEqual([
      ['job', 'deploy', false],
      ['step', 'Set up job', true],
      ['step', 'Smoke tests', true],
      ['job', 'verify', false],
    ]);
  });
});
