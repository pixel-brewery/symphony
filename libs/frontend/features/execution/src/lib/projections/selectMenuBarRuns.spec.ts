// #region Imports

import { describe, expect, it } from 'vitest';
import type { IRailRun } from './IRailRun';
import { selectMenuBarRuns } from './selectMenuBarRuns';

// #endregion

function run(id: string, kind: IRailRun['kind'], active: boolean, startedAt: string): IRailRun {
  return {
    id,
    kind,
    sourceLabel: kind === 'agent' ? 'Agent' : 'GitHub',
    title: id,
    message: id,
    state: active ? 'running' : 'succeeded',
    statusLabel: active ? 'In progress' : 'Succeeded',
    startedAt,
    active,
  };
}

describe('selectMenuBarRuns', () => {
  it('keeps active entries ahead of newer history and limits each category to three', () => {
    // arrange
    const runs = [
      run('agent-newest', 'agent', false, '2026-09-18T08:03:00.000Z'),
      run('action-active', 'cloud-action', true, '2026-09-18T08:02:00.000Z'),
      run('agent-active', 'agent', true, '2026-09-18T08:01:00.000Z'),
      run('agent-second', 'agent', false, '2026-09-18T08:00:00.000Z'),
      run('agent-fourth', 'agent', false, '2026-09-18T07:59:00.000Z'),
    ];

    // act
    const agentRuns = selectMenuBarRuns(runs, 'agent');
    const actionRuns = selectMenuBarRuns(runs, 'actions');

    // assert
    expect(agentRuns.map((candidate) => candidate.id)).toEqual([
      'agent-active',
      'agent-newest',
      'agent-second',
    ]);
    expect(actionRuns.map((candidate) => candidate.id)).toEqual(['action-active']);
  });
});
