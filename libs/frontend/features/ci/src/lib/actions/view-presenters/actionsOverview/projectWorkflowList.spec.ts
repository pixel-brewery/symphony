// #region Imports

import type { ICiWorkflow } from '@symphony/domain-ci';
import { describe, expect, it } from 'vitest';
import type { IActionRunRow } from './IActionRunRow';
import { projectWorkflowList } from './projectWorkflowList';

// #endregion

function workflow(id: string, name: string): ICiWorkflow {
  return {
    id,
    workspaceId: 'workspace',
    ciBindingId: 'ci',
    repositoryBindingId: 'repository',
    name,
    path: `.github/workflows/${id}.yml`,
    state: 'active',
    defaultBranch: 'main',
    supportsManualDispatch: true,
  };
}

function row(workflowId: string, status: IActionRunRow['status']): IActionRunRow {
  return {
    id: `${workflowId}:${status}`,
    workflowId,
    workflowName: workflowId,
    status,
    runner: 'github',
    startedAt: '2026-10-30T08:00:00.000Z',
    finishedAt: '2026-10-30T08:05:00.000Z',
    runningLocally: false,
  };
}

describe('projectWorkflowList', () => {
  it('orders failing, running, passing and idle workflows, each by name', () => {
    // act
    const entries = projectWorkflowList(
      [
        workflow('release', 'Release'),
        workflow('codeql', 'CodeQL'),
        workflow('cache', 'Cache Maintenance'),
        workflow('quality', 'PR Quality'),
        workflow('deploy', 'Deploy Dev'),
      ],
      [
        row('release', 'succeeded'),
        row('codeql', 'succeeded'),
        row('quality', 'in-progress'),
        row('deploy', 'failed'),
      ],
    );

    // assert
    expect(entries.map((entry) => [entry.workflow.name, entry.health])).toEqual([
      ['Deploy Dev', 'failing'],
      ['PR Quality', 'running'],
      ['CodeQL', 'passing'],
      ['Release', 'passing'],
      ['Cache Maintenance', 'idle'],
    ]);
  });
});
