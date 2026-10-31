// #region Imports

import { describe, expect, it } from 'vitest';
import { defaultWorkflow } from '../DefaultWorkflow';
import type { IWorkflowAuditEntry } from '../workflow/IWorkflowAuditEntry';
import type { IWorkflowDefinition } from '../workflow/IWorkflowDefinition';
import type { IWorkflowRecord } from '../workflow/IWorkflowRecord';
import { buildWorkflowGraph } from './buildWorkflowGraph';

// #endregion

function auditEntry(
  sequence: number,
  fromStageId: string,
  toStageId: string,
  extra: Partial<IWorkflowAuditEntry> = {},
): IWorkflowAuditEntry {
  return {
    id: `audit-${sequence}`,
    workItemId: 'work-1',
    sequence,
    occurredAt: `2026-08-19T10:0${sequence}:00.000Z`,
    kind: 'stage-changed',
    fromStageId,
    toStageId,
    actor: 'supervisor',
    detail: `${fromStageId} → ${toStageId}`,
    ...extra,
  };
}

function record(stageId: string, overrides: Partial<IWorkflowRecord> = {}): IWorkflowRecord {
  return {
    workItemId: 'work-1',
    workspaceId: 'personal',
    sourceId: 'board',
    workflowId: defaultWorkflow.id,
    workflowVersion: defaultWorkflow.version,
    stageId,
    runtimeState: 'running',
    revisions: {},
    routing: {},
    counters: {
      retriesByReason: {},
      reworksByRoute: {},
      consecutiveIdenticalFailures: 0,
      totalRuns: 1,
      enteredAt: '2026-08-19T10:00:00.000Z',
    },
    artifacts: [],
    pullRequestIds: [],
    updatedAt: '2026-08-19T10:05:00.000Z',
    ...overrides,
  };
}

describe('buildWorkflowGraph', () => {
  it('projects every configured stage and transition', () => {
    // act
    // arrange
    const graph = buildWorkflowGraph(defaultWorkflow);

    // assert
    expect(graph.workflowId).toBe(defaultWorkflow.id);
    expect(graph.nodes).toHaveLength(defaultWorkflow.stages.length);
    expect(graph.edges).toHaveLength(defaultWorkflow.transitions.length);
    expect(graph.defects).toEqual([]);
  });

  it('ranks the shipped process as one forward chain', () => {
    // arrange
    const graph = buildWorkflowGraph(defaultWorkflow);
    // act
    const columns = Object.fromEntries(graph.nodes.map((node) => [node.stageId, node.column]));

    // assert
    expect(columns).toEqual({
      backlog: 0,
      qualified: 1,
      ready: 2,
      progress: 3,
      acceptance: 4,
      done: 5,
    });
    // Every stage sits in its own column, so no lane stacking is needed.
    expect(graph.nodes.every((node) => node.row === 0)).toBe(true);
  });

  it('separates rework routes from the forward path', () => {
    // arrange
    const graph = buildWorkflowGraph(defaultWorkflow);
    const direction = (transitionId: string) =>
      graph.edges.find((edge) => edge.transitionId === transitionId)?.direction;

    // act
    const actual = direction('backlog-to-qualified');

    // assert
    expect(actual).toBe('forward');
    expect(direction('progress-to-acceptance')).toBe('forward');
    expect(direction('acceptance-to-backlog')).toBe('backward');
    expect(direction('progress-rework-to-qualified')).toBe('backward');
  });

  it('marks the stage the record holds as current and earlier stages as visited', () => {
    // arrange
    const graph = buildWorkflowGraph(defaultWorkflow, record('progress'), [
      auditEntry(1, 'backlog', 'qualified'),
      auditEntry(2, 'qualified', 'ready', { role: 'analyze', outcome: 'pass' }),
      auditEntry(3, 'ready', 'progress', { role: 'solve' }),
    ]);
    const state = (stageId: string) => graph.nodes.find((node) => node.stageId === stageId)?.state;

    // act
    const actual = state('backlog');

    // assert
    expect(actual).toBe('visited');
    expect(state('qualified')).toBe('visited');
    expect(state('ready')).toBe('visited');
    expect(state('progress')).toBe('current');
    expect(state('acceptance')).toBe('upcoming');
    expect(state('done')).toBe('upcoming');
    expect(graph.currentStageId).toBe('progress');
    expect(graph.runtimeState).toBe('running');
  });

  it('counts how often a rework route was taken', () => {
    // arrange
    const graph = buildWorkflowGraph(defaultWorkflow, record('qualified'), [
      auditEntry(1, 'backlog', 'qualified'),
      auditEntry(2, 'qualified', 'ready', { role: 'analyze', outcome: 'pass' }),
      auditEntry(3, 'ready', 'progress', { role: 'solve' }),
      auditEntry(4, 'progress', 'qualified', { role: 'verify', outcome: 'rework' }),
      auditEntry(5, 'qualified', 'ready', { role: 'analyze', outcome: 'pass' }),
      auditEntry(6, 'ready', 'progress', { role: 'solve' }),
      auditEntry(7, 'progress', 'qualified', { role: 'verify', outcome: 'rework' }),
    ]);
    // act
    const rework = graph.edges.find((edge) => edge.transitionId === 'progress-rework-to-qualified');

    // assert
    expect(rework?.state).toBe('taken');
    expect(rework?.traversalCount).toBe(2);
    expect(rework?.lastTraversedAt).toBe('2026-08-19T10:07:00.000Z');
    expect(graph.nodes.find((node) => node.stageId === 'qualified')?.visitCount).toBe(3);
  });

  it('separates transitions that share a route but differ in trigger', () => {
    // Two routes progress → qualified, distinguished only by which role reported the rework.
    // arrange
    const ambiguous: IWorkflowDefinition = {
      ...defaultWorkflow,
      transitions: [
        ...defaultWorkflow.transitions,
        {
          id: 'progress-rework-by-solve',
          from: 'progress',
          to: 'qualified',
          trigger: { kind: 'outcome', role: 'solve', outcome: 'rework' },
          guards: [],
        },
      ],
    };
    // act
    const graph = buildWorkflowGraph(ambiguous, record('qualified'), [
      auditEntry(1, 'progress', 'qualified', { role: 'verify', outcome: 'rework' }),
    ]);

    // assert
    expect(
      graph.edges.find((edge) => edge.transitionId === 'progress-rework-to-qualified')?.state,
    ).toBe('taken');
    expect(
      graph.edges.find((edge) => edge.transitionId === 'progress-rework-by-solve')?.state,
    ).toBe('idle');
  });

  it('offers the transitions leaving the current stage as available', () => {
    // arrange
    const graph = buildWorkflowGraph(defaultWorkflow, record('acceptance'));
    // act
    const available = graph.edges
      .filter((edge) => edge.state === 'available')
      .map((edge) => edge.transitionId)
      .sort();

    // assert
    expect(available).toEqual([
      'acceptance-to-backlog',
      'acceptance-to-done',
      'acceptance-to-progress',
      'acceptance-to-qualified',
    ]);
  });

  it('carries the guards of each transition so a view can explain a blocked route', () => {
    // arrange
    const graph = buildWorkflowGraph(defaultWorkflow);
    // act
    const claim = graph.edges.find((edge) => edge.transitionId === 'ready-to-progress');

    // assert
    expect(claim?.guards).toContain('claim-acquired');
    expect(claim?.guards).toContain('fencing-token-current');
    expect(
      graph.edges.find((edge) => edge.transitionId === 'acceptance-to-qualified')?.invalidates,
    ).toEqual(['analysis', 'implementation', 'verification', 'acceptance']);
  });

  it('reports configuration defects the schema does not catch', () => {
    // arrange
    const broken: IWorkflowDefinition = {
      ...defaultWorkflow,
      stages: [
        ...defaultWorkflow.stages,
        {
          id: 'orphan',
          label: 'Orphan',
          description: 'No route leads here and none leaves.',
          kind: 'automated',
          roles: ['analyze'],
        },
      ],
      transitions: [
        ...defaultWorkflow.transitions,
        {
          id: 'points-nowhere',
          from: 'done',
          to: 'missing-stage',
          trigger: { kind: 'reconciliation' },
          guards: [],
        },
      ],
    };
    // act
    const graph = buildWorkflowGraph(broken);

    // assert
    expect(graph.defects).toContainEqual(
      expect.objectContaining({ kind: 'unreachable-stage', stageId: 'orphan' }),
    );
    expect(graph.defects).toContainEqual(
      expect.objectContaining({ kind: 'dead-end-stage', stageId: 'orphan' }),
    );
    expect(graph.defects).toContainEqual(
      expect.objectContaining({
        kind: 'unknown-transition-endpoint',
        transitionId: 'points-nowhere',
      }),
    );
    expect(graph.nodes.find((node) => node.stageId === 'orphan')?.state).toBe('unreachable');
  });
});
