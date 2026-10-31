// #region Imports

import { describe, expect, it } from 'vitest';
import { defaultWorkflow } from '@symphony/domain-workflow';
import type { IExecutionRecord } from '../model/IExecutionRecord';
import type { IWorkItem } from '@symphony/domain-work';
import type { ProjectFieldDefinition } from '@symphony/domain-work';
import { inspectWorkItem } from './inspectWorkItem';

// #endregion

const assistanceField: ProjectFieldDefinition = {
  id: 'field-assistance',
  name: 'Assistant phase',
  role: 'assistance-action',
  type: 'single-select',
  options: [
    { id: 'option-none', label: 'None', assistanceAction: 'none' },
    { id: 'option-analyze', label: 'Analyze', assistanceAction: 'analyze' },
  ],
};

const priorityField: ProjectFieldDefinition = {
  id: 'field-priority',
  name: 'Priority',
  role: 'custom',
  type: 'single-select',
  options: [{ id: 'option-normal', label: 'Normal' }],
};

const statusField: ProjectFieldDefinition = {
  id: 'field-status',
  name: 'Status',
  role: 'workflow-state',
  type: 'single-select',
  options: [{ id: 'option-backlog', label: 'Backlog', stageId: 'backlog' }],
};

function createWorkItem(overrides: Partial<IWorkItem> = {}): IWorkItem {
  return {
    id: 'item-1',
    externalId: '#36',
    title: 'A change request',
    body: '',
    provider: 'github-projects',
    repository: 'owner/repository',
    repositoryBindingIds: ['binding-1'],
    stageId: 'backlog',
    boardColumnId: 'column-backlog',
    projectFields: [
      { fieldId: assistanceField.id, type: 'single-select', value: 'option-none' },
      { fieldId: priorityField.id, type: 'single-select', value: 'option-normal' },
    ],
    labels: [],
    assignees: [],
    ...overrides,
  };
}

function execution(overrides: Partial<IExecutionRecord> = {}): IExecutionRecord {
  return {
    id: 'execution-1',
    workItemId: 'item-1',
    workflowId: defaultWorkflow.id,
    kind: 'analysis',
    state: 'succeeded',
    summary: 'The analysis the implementation starts from.',
    startedAt: '2026-08-13T10:00:00.000Z',
    ...overrides,
  };
}

const context = {
  stages: defaultWorkflow.stages,
  fields: [assistanceField, priorityField, statusField],
};

describe('inspectWorkItem', () => {
  it('reports no severity for a completely configured item', () => {
    // act
    const actual = inspectWorkItem(createWorkItem(), context);

    // assert
    expect(actual).toEqual({ issues: [], repairs: [] });
  });

  it('blocks an item whose board column is not mapped to a workflow stage', () => {
    // act
    // arrange
    const health = inspectWorkItem(createWorkItem({ stageId: undefined }), {
      ...context,
      boardColumnLabel: 'Backlog',
    });

    // assert
    expect(health.severity).toBe('blocker');
    const issue = health.issues.find((candidate) => candidate.id === 'stage-unmapped');
    expect(issue?.detail).toContain('Backlog');
    expect(issue?.remedy).toContain('Connected services');
  });

  it('blocks a missing repository binding only once the stage runs the implementation', () => {
    // arrange
    const waiting = inspectWorkItem(
      createWorkItem({ repositoryBindingIds: [], stageId: 'backlog' }),
      context,
    );
    // act
    const implementing = inspectWorkItem(
      createWorkItem({ repositoryBindingIds: [], stageId: 'progress' }),
      context,
    );

    // assert
    expect(waiting.issues.find((issue) => issue.id === 'repository-unbound')?.severity).toBe(
      'incomplete',
    );
    expect(implementing.issues.find((issue) => issue.id === 'repository-unbound')?.severity).toBe(
      'blocker',
    );
  });

  it('names the open decisions that keep an analysed item out of the implementation', () => {
    // arrange
    // The run history looks perfect - a succeeded analysis with a summary - while the stored
    // analysis never declared the item ready. Only the readiness projection can tell.
    const health = inspectWorkItem(createWorkItem({ stageId: 'ready' }), {
      ...context,
      executions: [execution()],
      readiness: {
        workItemId: 'item-1',
        analysisStored: true,
        readyForSolve: false,
        riskClass: 'medium',
        openDecisions: ['Which locales are in scope?'],
        hardDependencyIds: [],
        running: false,
      },
    });

    // act
    const issue = health.issues.find(
      (candidate) => candidate.id === 'analysis-not-ready-for-solve',
    );

    // assert
    expect(health.severity).toBe('blocker');
    expect(issue?.summary).toBe('Analysis left 1 open decision unanswered');
    expect(issue?.detail).toContain('Which locales are in scope?');
    expect(
      health.issues.find(
        (candidate) => candidate.id === 'analysis-missing-in-implementation-stage',
      ),
    ).toBeUndefined();
  });

  it('warns about a critical risk and a dependency without stopping a ready item', () => {
    // arrange
    const health = inspectWorkItem(createWorkItem({ stageId: 'ready' }), {
      ...context,
      executions: [execution()],
      readiness: {
        workItemId: 'item-1',
        analysisStored: true,
        readyForSolve: true,
        riskClass: 'critical',
        openDecisions: [],
        hardDependencyIds: ['#54'],
        running: false,
      },
    });

    // act
    const ids = health.issues.map((issue) => issue.id);

    // assert
    // The analysis weighed both and reported the item ready, so these inform rather than stop.
    expect(health.severity).toBe('incomplete');
    expect(ids).toContain('risk-class-critical');
    expect(health.issues.find((issue) => issue.id === 'hard-dependency-open')?.detail).toContain(
      '#54',
    );
  });

  it('stays silent while a run owns the item', () => {
    // arrange
    // act
    const health = inspectWorkItem(createWorkItem({ stageId: 'ready' }), {
      ...context,
      executions: [execution()],
      readiness: {
        workItemId: 'item-1',
        analysisStored: false,
        readyForSolve: false,
        openDecisions: [],
        hardDependencyIds: [],
        running: true,
      },
    });

    // assert
    expect(health.severity).toBeUndefined();
  });

  it('blocks an item that reached an implementing stage without a stored analysis', () => {
    // arrange
    // act
    const health = inspectWorkItem(createWorkItem({ stageId: 'ready' }), {
      ...context,
      executions: [execution()],
      readiness: {
        workItemId: 'item-1',
        analysisStored: false,
        readyForSolve: false,
        openDecisions: [],
        hardDependencyIds: [],
        running: false,
      },
    });

    // assert
    expect(
      health.issues.find((issue) => issue.id === 'analysis-missing-in-implementation-stage')
        ?.severity,
    ).toBe('blocker');
  });

  it('blocks an item that carries a closing label while its stage still runs work', () => {
    // arrange
    const health = inspectWorkItem(createWorkItem({ labels: ['enhancement', 'wontfix'] }), context);

    // act
    const issue = health.issues.find(
      (candidate) => candidate.id === 'closing-label-in-active-stage',
    );
    // assert
    expect(issue?.severity).toBe('blocker');
    expect(issue?.summary).toContain('wontfix');
  });

  it('accepts a closing label once the item rests in a terminal stage', () => {
    // arrange
    const health = inspectWorkItem(
      createWorkItem({ labels: ['duplicate'], stageId: 'done' }),
      context,
    );

    // act
    const actual = health.issues.map((issue) => issue.id);

    // assert
    expect(actual).not.toContain('closing-label-in-active-stage');
  });

  it('blocks an item whose foreign claim outlived its lease', () => {
    // arrange
    const health = inspectWorkItem(
      createWorkItem({
        coordination: { state: 'claimed', claimId: 'claim-1', action: 'analyze', expired: true },
      }),
      context,
    );

    // act
    const actual = health.issues.map((issue) => issue.id);

    // assert
    expect(actual).toContain('claim-expired');
  });

  it('ignores a claim that is still held', () => {
    // arrange
    const health = inspectWorkItem(
      createWorkItem({
        coordination: { state: 'claimed', claimId: 'claim-1', action: 'analyze' },
      }),
      context,
    );

    // act
    const actual = health.issues.map((issue) => issue.id);

    // assert
    expect(actual).not.toContain('claim-expired');
  });

  it('offers the neutral option as a repair when the assistance field is empty', () => {
    // act
    // arrange
    const health = inspectWorkItem(
      createWorkItem({
        projectFields: [
          { fieldId: priorityField.id, type: 'single-select', value: 'option-normal' },
        ],
      }),
      context,
    );

    // assert
    expect(health.severity).toBe('incomplete');
    expect(health.repairs).toEqual([
      {
        fieldId: assistanceField.id,
        fieldName: 'Assistant phase',
        valueLabel: 'None',
        value: { fieldId: assistanceField.id, type: 'single-select', value: 'option-none' },
      },
    ]);
  });

  it('stays silent about empty board fields, because an unset optional value is not a finding', () => {
    // arrange
    const textField: ProjectFieldDefinition = {
      id: 'field-notes',
      name: 'Notes',
      role: 'custom',
      type: 'text',
    };
    // act
    const health = inspectWorkItem(
      createWorkItem({
        projectFields: [
          { fieldId: assistanceField.id, type: 'single-select', value: 'option-none' },
          { fieldId: textField.id, type: 'text', value: '   ' },
        ],
      }),
      { ...context, fields: [...context.fields, textField] },
    );

    // assert
    expect(health.severity).toBeUndefined();
    expect(health.issues).toEqual([]);
  });

  it('blocks an item that waits to be implemented without a completed analysis', () => {
    // arrange
    const health = inspectWorkItem(createWorkItem({ stageId: 'ready' }), {
      ...context,
      executions: [],
      boardColumnLabel: 'Ready',
    });

    // act
    const issue = health.issues.find(
      (candidate) => candidate.id === 'analysis-missing-in-implementation-stage',
    );
    // assert
    expect(health.severity).toBe('blocker');
    expect(issue?.summary).toContain('Ready');
    expect(issue?.detail).toContain('Qualified');
    expect(issue?.remedy).toContain('Status');
  });

  it('accepts the same item once an analysis it can implement from exists', () => {
    // arrange
    const health = inspectWorkItem(createWorkItem({ stageId: 'ready' }), {
      ...context,
      executions: [execution()],
    });

    // act
    const actual = health.issues.map((issue) => issue.id);

    // assert
    expect(actual).not.toContain('analysis-missing-in-implementation-stage');
  });

  it('reads a succeeded analysis without a summary as no analysis at all', () => {
    // arrange
    const health = inspectWorkItem(createWorkItem({ stageId: 'ready' }), {
      ...context,
      executions: [execution({ summary: undefined })],
    });

    // act
    const actual = health.issues.map((issue) => issue.id);

    // assert
    expect(actual).toContain('analysis-missing-in-implementation-stage');
  });

  it('stays quiet while a run is still in flight or an implementation already succeeded', () => {
    // arrange
    const running = inspectWorkItem(createWorkItem({ stageId: 'ready' }), {
      ...context,
      executions: [execution({ state: 'running', summary: undefined })],
    });
    const implemented = inspectWorkItem(createWorkItem({ stageId: 'progress' }), {
      ...context,
      executions: [execution({ kind: 'solution' })],
    });

    // act
    const actual = running.issues.map((issue) => issue.id);

    // assert
    expect(actual).not.toContain('analysis-missing-in-implementation-stage');
    expect(implemented.issues.map((issue) => issue.id)).not.toContain(
      'analysis-missing-in-implementation-stage',
    );
  });

  it('says nothing about the analysis while the execution history is unknown', () => {
    // act
    // arrange
    const health = inspectWorkItem(createWorkItem({ stageId: 'ready' }), context);

    // assert
    expect(health.issues).toEqual([]);
  });

  it('ranks a blocker above missing fields on the same item', () => {
    // act
    // arrange
    const health = inspectWorkItem(
      createWorkItem({ labels: ['wontfix'], projectFields: [] }),
      context,
    );

    // assert
    expect(health.severity).toBe('blocker');
    expect(health.issues.some((issue) => issue.severity === 'incomplete')).toBe(true);
  });
});
