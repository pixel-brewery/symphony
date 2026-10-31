// #region Imports

import type { ICiRunJob } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import { buildActionLogView } from './buildActionLogView';

// #endregion

const jobs: readonly ICiRunJob[] = [
  {
    id: 'job-1',
    name: 'Browser E2E shard 3/4',
    status: 'failed',
    steps: [
      { id: 'step-1', name: 'Set up job', status: 'succeeded' },
      { id: 'step-2', name: 'Install Playwright browsers', status: 'failed' },
    ],
  },
];

describe('buildActionLogView', () => {
  it('places each GitHub Actions log line below its reported step', () => {
    // act
    // arrange
    const view = buildActionLogView(
      jobs,
      [
        'Browser E2E shard 3/4\tSet up job\tCurrent runner version: 2.336.0',
        'Browser E2E shard 3/4\tInstall Playwright browsers\tDownloading Chromium',
        'Browser E2E shard 3/4\tInstall Playwright browsers\tError: Process completed with exit code 1.',
      ].join('\n'),
    );

    // assert
    expect(view.jobs[0]?.steps[0]?.protocol).toBe('Current runner version: 2.336.0');
    expect(view.jobs[0]?.steps[1]?.protocol).toBe(
      'Downloading Chromium\nError: Process completed with exit code 1.',
    );
    expect(view.runProtocols).toEqual([]);
  });

  it('keeps provider diagnostics inside the timeline when no step prefix exists', () => {
    // act
    // arrange
    const view = buildActionLogView(
      jobs,
      'Unstructured workflow output',
      undefined,
      undefined,
      'VM ready',
    );

    // assert
    expect(view.runProtocols).toEqual([
      {
        id: 'workflow-output',
        title: 'Workflow output',
        content: 'Unstructured workflow output',
        status: 'succeeded',
      },
      {
        id: 'local-runner-diagnostics',
        title: 'Local runner diagnostics',
        content: 'VM ready',
        status: 'queued',
      },
    ]);
  });
});
