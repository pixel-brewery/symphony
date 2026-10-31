// #region Imports

import { describe, expect, it } from 'vitest';
import { ciRequestSchemas as requestSchemas } from './CiRequestSchemas';
import { ciResponseSchemas as responseSchemas } from './CiResponseSchemas';

// #endregion

describe('CiRequestSchemas', () => {
  it('requires a machine name for removal and answers with the remaining machines', () => {
    // arrange
    // act
    // assert
    expect(() => requestSchemas['local-ci.instances.remove'].parse({ name: '' })).toThrow();
    expect(requestSchemas['local-ci.instances.remove'].parse({ name: 'sci-01' })).toEqual({
      name: 'sci-01',
    });
    expect(
      responseSchemas['local-ci.instances.remove'].parse({ removed: true, instances: [] }),
    ).toEqual({ removed: true, instances: [] });
  });

  it('bounds the run-history read by an ISO instant and answers with recorded runs', () => {
    // arrange
    const request = requestSchemas['ci.runs.history.list'];
    const response = responseSchemas['ci.runs.history.list'];

    // act
    const actual = request.parse({ since: '2026-08-02T12:00:00.000Z' });
    const history = response.parse({
      runs: [
        {
          id: 'ci-1:7',
          workspaceId: 'personal',
          ciBindingId: 'ci-1',
          repositoryBindingId: 'repository-1',
          name: 'Deploy Dev',
          status: 'failed',
          startedAt: '2026-10-30T10:00:00.000Z',
          runAttempt: 2,
        },
      ],
      recordedSince: '2026-08-01T00:00:00.000Z',
      truncated: false,
    });

    // assert
    expect(actual).toEqual({ since: '2026-08-02T12:00:00.000Z' });
    expect(history.runs[0]?.runAttempt).toBe(2);
    expect(() => request.parse({ since: 'yesterday' })).toThrow();
    expect(() => response.parse({ runs: [], truncated: 'no' })).toThrow();
  });
});
