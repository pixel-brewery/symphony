// #region Imports

import { describe, expect, it } from 'vitest';
import type { IActionRunRow } from './IActionRunRow';
import { composeFixFeedback } from './composeFixFeedback';

// #endregion

const row: IActionRunRow = {
  id: 'ci:1',
  workflowName: 'Deploy Dev',
  status: 'failed',
  runner: 'github',
  branch: 'dev',
  revision: 'e81f3b2',
  runningLocally: false,
};

describe('composeFixFeedback', () => {
  it('names the workflow, the failed steps and the untrusted log excerpt', () => {
    // act
    const feedback = composeFixFeedback(
      row,
      [
        {
          id: 'build',
          kind: 'step',
          name: 'Build and publish',
          status: 'succeeded',
          nested: false,
        },
        {
          id: 'deploy',
          kind: 'step',
          name: 'Deploy to app-flamox-dev',
          status: 'failed',
          nested: false,
        },
      ],
      'ERROR: The resource could not be found.',
    );

    // assert
    expect(feedback).toContain(
      'The GitHub Actions workflow "Deploy Dev" failed on dev at e81f3b2.',
    );
    expect(feedback).toContain('Failed steps: Deploy to app-flamox-dev.');
    expect(feedback).toContain('untrusted workflow output');
    expect(feedback).toContain('ERROR: The resource could not be found.');
  });

  it('stays within the revision request limit', () => {
    // act
    const feedback = composeFixFeedback(row, [], 'x'.repeat(30_000));

    // assert
    expect(feedback.length).toBe(20_000);
  });
});
