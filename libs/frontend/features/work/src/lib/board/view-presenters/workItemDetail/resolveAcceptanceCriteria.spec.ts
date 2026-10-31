// #region Imports

import type { IGoalRecord } from '@symphony/domain-execution';
import { describe, expect, it } from 'vitest';
import { resolveAcceptanceCriteria } from './resolveAcceptanceCriteria';

// #endregion

function goal(overrides: Partial<IGoalRecord> = {}): IGoalRecord {
  return {
    id: 'goal-1',
    workspaceId: 'personal',
    workItemId: 'work-1',
    assignment: {
      id: 'assignment-1',
      workspaceId: 'personal',
      workItemId: 'work-1',
      agentTeamId: 'team-1',
      responsibleAgentId: 'agent-1',
      objective: 'Reduce ingest',
      assignedAt: '2026-10-28T10:00:00.000Z',
      updatedAt: '2026-10-28T10:00:00.000Z',
    },
    state: 'verifying',
    currentRole: 'solution',
    handoffs: [],
    verificationReports: [],
    reviewDecisions: [],
    createdAt: '2026-10-28T10:00:00.000Z',
    updatedAt: '2026-10-28T10:00:00.000Z',
    implementationContract: {
      id: 'contract-1',
      version: 2,
      createdByExecutionId: 'execution-1',
      createdAt: '2026-10-28T10:00:00.000Z',
      instructions: '',
      acceptanceCriteria: ['Request bodies are no longer sent', 'APM traces are kept for 8 days'],
      allowedPathPatterns: [],
      forbiddenPathPatterns: [],
      allowedCommands: [],
      maximumChangedFiles: 10,
      maximumDiffLines: 400,
    },
    ...overrides,
  };
}

describe('resolveAcceptanceCriteria', () => {
  it('marks a criterion met only when the newest verification passed a check of that wording', () => {
    // arrange
    const record = goal({
      verificationReports: [
        {
          id: 'report-1',
          executionId: 'execution-2',
          recordedAt: '2026-10-31T17:00:00.000Z',
          state: 'failed',
          changedFiles: [],
          diffLines: 0,
          checks: [
            { label: 'request bodies are no longer sent', state: 'passed' },
            { label: 'APM traces are kept for 8 days', state: 'failed' },
          ],
        },
      ],
    });

    // act
    const actual = resolveAcceptanceCriteria('work-1', record);

    // assert
    expect(actual).toEqual([
      { text: 'Request bodies are no longer sent', met: true },
      { text: 'APM traces are kept for 8 days', met: false },
    ]);
  });

  it('counts every criterion met once the goal was accepted', () => {
    // act
    const actual = resolveAcceptanceCriteria('work-1', goal({ state: 'achieved' }));

    // assert
    expect(actual.every((criterion) => criterion.met)).toBe(true);
  });

  it('prefers the criteria the plan names for this work item and is empty without a plan', () => {
    // arrange
    const grouped = goal();
    const contract = {
      ...grouped.implementationContract!,
      acceptanceCriteriaByWorkItem: { 'work-1': ['Only for this item'] },
    };

    // act
    const actual = resolveAcceptanceCriteria('work-1', {
      ...grouped,
      implementationContract: contract,
    });

    // assert
    expect(actual).toEqual([{ text: 'Only for this item', met: false }]);
    expect(resolveAcceptanceCriteria('work-1', undefined)).toEqual([]);
  });
});
