// @vitest-environment jsdom

// #region Imports

import type { ICiRun, ICiWorkflow } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import { projectCiPaletteResults } from './projectCiPaletteResults';

// #endregion

describe('projectCiPaletteResults', () => {
  it('lists matching runs, newest first among equal matches, each opening its run on Actions', () => {
    // arrange
    const runs = [
      run('run:86', 'Deploy Dev', 'failed', '2026-10-30T08:00:00Z', 86),
      run('run:87', 'Deploy Dev', 'in-progress', '2026-10-31T08:00:00Z', 87),
      run('run:12', 'Lint', 'succeeded', '2026-10-31T09:00:00Z', 12),
    ];

    // act
    const results = projectCiPaletteResults(runs, [], 'deploy');

    // assert
    expect(
      results.map((result) => [result.id, result.reference, result.title, result.facts]),
    ).toEqual([
      ['action-run:run:87', 'Deploy Dev', 'Prepare release', ['In progress', 'main', 'run #87']],
      ['action-run:run:86', 'Deploy Dev', 'Prepare release', ['Failed', 'main', 'run #86']],
    ]);
    expect(results[0]).toMatchObject({
      group: 'action-runs',
      icon: 'executionOutline',
      action: { kind: 'navigate', path: '/main/actions', queryParams: { run: 'run:87' } },
    });
  });

  it('offers to run matching workflows that can be started by hand, through Actions', () => {
    // arrange
    const workflows = [
      workflow('deploy-dev', 'Deploy Dev', true),
      workflow('deploy-prod', 'Deploy Prod', false),
      { ...workflow('deploy-old', 'Deploy Old', true), state: 'disabled' as const },
    ];

    // act
    const results = projectCiPaletteResults([], workflows, 'deploy');

    // assert
    expect(results).toEqual([
      expect.objectContaining({
        id: 'command:run-workflow:deploy-dev',
        group: 'commands',
        icon: 'play',
        title: 'Run Deploy Dev on GitHub',
        action: {
          kind: 'navigate',
          path: '/main/actions',
          queryParams: { workflow: 'deploy-dev', dispatch: 'github' },
        },
      }),
    ]);
  });

  it('offers Run workflow… only while a workflow can be started by hand', () => {
    // act
    const opening = projectCiPaletteResults([], [workflow('w', 'Build', true)], '');
    const typed = projectCiPaletteResults([], [workflow('w', 'Build', true)], 'run work');
    const none = projectCiPaletteResults([], [workflow('w', 'Build', false)], '');

    // assert
    expect(opening.map((result) => [result.title, result.action])).toEqual([
      ['Run workflow…', { kind: 'navigate', path: '/main/actions' }],
    ]);
    expect(typed.map((result) => [result.title, result.rank])).toEqual([
      ['Run Build on GitHub', 4],
      ['Run workflow…', 6],
    ]);
    expect(none).toEqual([]);
  });
});

function run(
  id: string,
  name: string,
  status: ICiRun['status'],
  startedAt: string,
  runNumber: number,
): ICiRun {
  return {
    id,
    workspaceId: 'workspace',
    ciBindingId: 'ci',
    repositoryBindingId: 'repository',
    name,
    title: name === 'Lint' ? 'Lint the code' : 'Prepare release',
    branch: 'main',
    status,
    startedAt,
    runNumber,
  };
}

function workflow(id: string, name: string, supportsManualDispatch: boolean): ICiWorkflow {
  return {
    id,
    workspaceId: 'workspace',
    ciBindingId: 'ci',
    repositoryBindingId: 'repository',
    name,
    path: `.github/workflows/${id}.yml`,
    state: 'active',
    defaultBranch: 'main',
    supportsManualDispatch,
  };
}
