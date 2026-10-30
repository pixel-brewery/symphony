// #region Imports

import type { ICiRunJob, ICiWorkflowGraph } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import { projectCiJobs } from './projectCiJobs';

// #endregion

describe('projectCiJobs', () => {
  it('associates actual matrix executions and distinguishes pending from skipped jobs', () => {
    // arrange
    const graph: ICiWorkflowGraph = {
      revision: 'sha',
      path: 'workflow',
      unresolved: [],
      jobs: [
        { id: 'matrix', name: 'Tests', needs: [], matrix: true },
        { id: 'pending', name: 'Deploy', needs: ['matrix'], matrix: false },
        { id: 'skipped', name: 'Cleanup', needs: [], matrix: false },
      ],
    };
    const runs: readonly ICiRunJob[] = [
      { id: 'linux', workflowJobId: 'matrix', name: 'Linux', status: 'succeeded', steps: [] },
      { id: 'mac', workflowJobId: 'matrix', name: 'Mac', status: 'in-progress', steps: [] },
      { id: 'cleanup', workflowJobId: 'skipped', name: 'Cleanup', status: 'skipped', steps: [] },
      { id: 'unmatched', name: 'Unresolved execution', status: 'failed', steps: [] },
    ];
    // act
    const jobs = projectCiJobs(graph, runs);
    // assert
    expect(jobs[0]?.executions.map((run) => run.id)).toEqual(['linux', 'mac']);
    expect(jobs[0]?.status).toBe('in-progress');
    expect(jobs[1]?.status).toBeUndefined();
    expect(jobs[1]?.executions).toEqual([]);
    expect(jobs[2]?.status).toBe('skipped');
    expect(jobs.every((job) => !job.unresolved)).toBe(true);
  });

  it('keeps a matrix failure after the remaining executions finish successfully', () => {
    // arrange
    const graph: ICiWorkflowGraph = {
      revision: 'sha',
      path: 'workflow',
      unresolved: [],
      jobs: [{ id: 'test', name: 'Tests', needs: [], matrix: true }],
    };
    const runs: readonly ICiRunJob[] = [
      { id: 'linux', workflowJobId: 'test', name: 'Linux', status: 'failed', steps: [] },
      { id: 'mac', workflowJobId: 'test', name: 'Mac', status: 'succeeded', steps: [] },
    ];
    // act
    const jobs = projectCiJobs(graph, runs);
    // assert
    expect(jobs[0]?.status).toBe('failed');
  });

  it('retains 200 cyclic jobs and flags missing dependencies without looping', () => {
    // arrange
    const graph: ICiWorkflowGraph = {
      revision: 'sha',
      path: 'workflow',
      unresolved: [],
      jobs: Array.from({ length: 200 }, (_, index) => ({
        id: String(index),
        name: String(index),
        needs: [String((index + 1) % 199)],
        matrix: false,
      })).concat([
        { id: 'missing', name: 'Missing dependency', needs: ['unknown'], matrix: false },
      ]),
    };
    // act
    const jobs = projectCiJobs(graph, []);
    // assert
    expect(jobs).toHaveLength(201);
    expect(jobs.every((job) => job.unresolved)).toBe(true);
  });
});
