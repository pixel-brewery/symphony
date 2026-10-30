// #region Imports

import { describe, expect, it } from 'vitest';
import { WorkflowEngineService } from './WorkflowEngineService';
import {
  defaultWorkflow,
  type IAnalysisArtifact,
  type IWorkflowRecord,
} from '@symphony/domain-workflow';
import { type IWorkItem } from '@symphony/domain-work';

// #endregion

function readyArtifact(issueRevision = ''): IAnalysisArtifact {
  return {
    feasible: true,
    issueRevision,
    problemUnderstanding: 'Reconcile managed workspaces after restart.',
    affectedComponents: ['orchestrator'],
    likelyChangeSurface: ['libs/application/src/lib/analyzer-service.ts'],
    dependencies: [],
    implementationPlan: [{ step: 1, description: 'Reconcile workspace metadata.' }],
    databaseMigrationRequired: false,
    risk: { class: 'low', reasons: [] },
    testStrategy: ['unit'],
    acceptanceMapping: [
      {
        acceptanceCriterion: 'Drifted workspaces are recovered.',
        implementationStep: 1,
        verification: 'unit test',
      },
    ],
    unresolvedQuestions: [],
    collisionRisk: 'low',
    readyForSolve: true,
  };
}

function workItem(stageId: string | undefined): IWorkItem {
  return {
    id: 'work-1',
    workspaceId: 'personal',
    sourceId: 'board',
    externalId: '#1',
    title: 'Add deterministic reconciliation',
    body: 'Reconcile managed workspaces after restart.',
    ...(stageId ? { stageId } : {}),
    provider: 'simulated',
    repository: 'example/platform',
    labels: [],
    assignees: [],
  };
}

function createEngine(item: IWorkItem, options: { readonly closable?: boolean } = {}) {
  const records = new Map<string, IWorkflowRecord>();
  const transitions: [string, string][] = [];
  const closures: [string, string][] = [];
  let current = item;
  let now = '2026-08-19T10:00:00.000Z';
  const engine = new WorkflowEngineService({
    workflow: () => defaultWorkflow,
    records: {
      workflowRecord: (id) => records.get(id),
      listWorkflowRecords: () => [...records.values()],
      saveWorkflowRecord: (record) => void records.set(record.workItemId, record),
      saveWorkflowAudit: () => undefined,
      listWorkflowAudit: () => [],
      nextWorkflowAuditSequence: () => 1,
    },
    tracker: {
      transition: async (_id, stageId) => {
        transitions.push([_id, stageId]);
        current = { ...current, stageId };
        return current;
      },
      ...(options.closable === false
        ? {}
        : {
            closeWorkItem: async (_id: string, reason: string) => {
              closures.push([_id, reason]);
              current = { ...current, nativeState: 'closed' };
              return current;
            },
          }),
    },
    clock: { now: () => now },
    ids: { next: (prefix) => `${prefix}-1` },
    owner: () => 'test-machine',
    workItemChanged: (updated) => void (current = updated),
    capacityAvailable: () => true,
  });
  return {
    engine,
    transitions,
    closures,
    records,
    item: () => current,
    setNow: (instant: string) => {
      now = instant;
    },
  };
}

function solveClaim(leaseUntil = '2026-08-19T10:30:00.000Z') {
  return {
    id: 'refs/heads/symphony/claims/abc@c1a1',
    workItemId: 'work-1',
    action: 'solve' as const,
    owner: 'octocat',
    acquiredAt: '2026-08-19T09:59:00.000Z',
    leaseUntil,
    heartbeatAt: '2026-08-19T09:59:30.000Z',
    claimVersion: 1,
  };
}

describe('WorkflowEngineService', () => {
  it('resolves an operator option from the current stage and uses the existing audited transition', async () => {
    // arrange
    const test = createEngine(workItem('backlog'));
    // act
    const record = await test.engine.applyOperatorDecision(test.item(), {
      workItemId: 'work-1',
      optionId: 'approve',
      decidedBy: 'named operator',
      note: 'Reviewed',
      commitSha: 'accepted-revision',
    });
    // assert
    expect(test.transitions).toEqual([['work-1', 'qualified']]);
    expect(record?.stageId).toBe('qualified');
  });

  it('refuses an option that the current stage does not offer before changing the board', () => {
    // arrange
    const test = createEngine(workItem('backlog'));
    // act / assert
    expect(() =>
      test.engine.applyOperatorDecision(test.item(), {
        workItemId: 'work-1',
        optionId: 'unknown',
        decidedBy: 'operator',
      }),
    ).toThrow('The current stage offers no decision "unknown".');
    expect(test.transitions).toEqual([]);
  });

  it('moves a work item through a human gate only when a decision is recorded', async () => {
    // arrange
    const test = createEngine(workItem('backlog'));

    // act
    const record = await test.engine.applyHumanDecision(test.item(), {
      id: 'decision-1',
      workItemId: 'work-1',
      stageId: 'backlog',
      optionId: 'approve',
      effect: 'advance',
      targetStageId: 'qualified',
      decidedBy: 'operator',
      decidedAt: '2026-08-19T10:00:00.000Z',
      source: 'operator',
    });

    // assert
    expect(test.transitions).toEqual([['work-1', 'qualified']]);
    expect(record?.stageId).toBe('qualified');
    expect(test.item().stageId).toBe('qualified');
  });

  it('closes the tracked item and lands it in the terminal stage when a gate closes it', async () => {
    // arrange
    const test = createEngine(workItem('backlog'));

    // act
    const record = await test.engine.applyHumanDecision(test.item(), {
      id: 'decision-1',
      workItemId: 'work-1',
      stageId: 'backlog',
      optionId: 'duplicate',
      effect: 'close',
      closureReason: 'duplicate',
      decidedBy: 'operator',
      decidedAt: '2026-08-19T10:00:00.000Z',
      source: 'operator',
    });

    // A closure that never leaves the workflow record is invisible to everyone who follows
    // the ticket, and the board keeps offering the item as work that is still to be done.
    // assert
    expect(test.closures).toEqual([['work-1', 'duplicate']]);
    expect(test.transitions).toEqual([['work-1', 'done']]);
    expect(test.item().nativeState).toBe('closed');
    expect(record?.runtimeState).toBe('closed');
    expect(record?.stageId).toBe('done');
    expect(record?.routing.closureReason).toBe('duplicate');
  });

  it('records the closure even when the provider cannot close the item', async () => {
    // arrange
    const test = createEngine(workItem('backlog'), { closable: false });

    // act
    const record = await test.engine.applyHumanDecision(test.item(), {
      id: 'decision-1',
      workItemId: 'work-1',
      stageId: 'backlog',
      optionId: 'reject',
      effect: 'close',
      closureReason: 'not-planned',
      decidedBy: 'operator',
      decidedAt: '2026-08-19T10:00:00.000Z',
      source: 'operator',
    });

    // assert
    expect(test.closures).toEqual([]);
    expect(test.transitions).toEqual([['work-1', 'done']]);
    expect(record?.runtimeState).toBe('closed');
    expect(record?.routing.closureReason).toBe('not-planned');
  });

  it('holds the work item and raises a question when a guard of the transition fails', async () => {
    // arrange
    const test = createEngine({ ...workItem('backlog'), body: '   ' });

    // act
    const record = await test.engine.applyHumanDecision(test.item(), {
      id: 'decision-1',
      workItemId: 'work-1',
      stageId: 'backlog',
      optionId: 'approve',
      effect: 'advance',
      targetStageId: 'qualified',
      decidedBy: 'operator',
      decidedAt: '2026-08-19T10:00:00.000Z',
      source: 'operator',
    });

    // assert
    expect(test.transitions).toEqual([]);
    expect(record?.stageId).toBe('backlog');
    expect(record?.runtimeState).toBe('human-required');
    expect(record?.humanRequest?.rationale).toContain('title and a description');
  });

  it('moves a qualified work item to ready when analyze passes with a complete Definition of Ready', async () => {
    // arrange
    const test = createEngine(workItem('qualified'));

    // act
    const record = await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Analysis complete.',
      evidence: [],
      analysis: readyArtifact(),
      finishedAt: '2026-08-19T10:00:00.000Z',
    });

    // assert
    expect(test.transitions).toEqual([['work-1', 'ready']]);
    expect(record?.stageId).toBe('ready');
    expect(record?.analysis?.readyForSolve).toBe(true);
    expect(test.item().stageId).toBe('ready');
  });

  it('refuses the ready transition when the analysis carries no provable Definition of Ready', async () => {
    // arrange
    const test = createEngine(workItem('qualified'));

    // act
    const record = await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Prose without the machine-readable block.',
      evidence: [],
      finishedAt: '2026-08-19T10:00:00.000Z',
    });

    // assert
    expect(test.transitions).toEqual([]);
    expect(record?.stageId).toBe('qualified');
    expect(record?.runtimeState).toBe('human-required');
    expect(record?.humanRequest?.reasonCode).toBe('guard-not-satisfiable');
  });

  it('refuses the ready transition while the analysis reports open questions', async () => {
    // arrange
    const test = createEngine(workItem('qualified'));

    // act
    const record = await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Analysis with an unresolved decision.',
      evidence: [],
      analysis: {
        ...readyArtifact(),
        unresolvedQuestions: ['Which retention period applies?'],
        readyForSolve: false,
      },
      finishedAt: '2026-08-19T10:00:00.000Z',
    });

    // assert
    expect(test.transitions).toEqual([]);
    expect(record?.stageId).toBe('qualified');
    expect(record?.runtimeState).toBe('human-required');
  });

  it('supersedes a stale supervisor guard question once a later run reports a fresh result', async () => {
    // arrange
    const test = createEngine({ ...workItem('qualified'), revision: 2 });

    // The first analysis ran against an older issue revision, so the transition is refused
    // and the supervisor leaves its question on the record.
    // act
    const rejected = await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Analysis of an outdated issue revision.',
      evidence: [],
      analysis: readyArtifact('1'),
      revisions: { issueRevision: '1' },
      finishedAt: '2026-08-19T10:00:00.000Z',
    });
    // assert
    expect(test.transitions).toEqual([]);
    expect(rejected?.runtimeState).toBe('human-required');
    expect(rejected?.humanRequest?.reasonCode).toBe('guard-not-satisfiable');

    // A re-analysis against the current revision must not be blocked by that stale question.
    const record = await test.engine.applyRunResult(test.item(), {
      runId: 'execution-2',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Analysis complete for the current revision.',
      evidence: [],
      analysis: readyArtifact('2'),
      revisions: { issueRevision: '2' },
      finishedAt: '2026-08-19T10:05:00.000Z',
    });

    expect(test.transitions).toEqual([['work-1', 'ready']]);
    expect(record?.stageId).toBe('ready');
    expect(record?.humanRequest).toBeUndefined();
  });

  it('moves a ready work item to progress only through the guarded claim transition', async () => {
    // arrange
    const test = createEngine(workItem('qualified'));
    // act
    await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Analysis complete.',
      evidence: [],
      analysis: readyArtifact(),
      revisions: { analysisRevision: 'abc123' },
      finishedAt: '2026-08-19T10:00:00.000Z',
    });
    // assert
    expect(test.item().stageId).toBe('ready');

    const moved = await test.engine.applyClaim(test.item(), 'solve', 'execution-2', solveClaim());

    expect(moved.stageId).toBe('progress');
    expect(test.transitions).toEqual([
      ['work-1', 'ready'],
      ['work-1', 'progress'],
    ]);
    const record = test.records.get('work-1');
    expect(record?.stageId).toBe('progress');
    expect(record?.claim).toMatchObject({
      owner: 'octocat',
      role: 'solve',
      runId: 'execution-2',
      claimVersion: 1,
    });
  });

  it('refuses the claim transition when the lease is already expired', async () => {
    // arrange
    const test = createEngine(workItem('qualified'));
    // act
    await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Analysis complete.',
      evidence: [],
      analysis: readyArtifact(),
      revisions: { analysisRevision: 'abc123' },
      finishedAt: '2026-08-19T10:00:00.000Z',
    });

    // assert
    await expect(
      test.engine.applyClaim(
        test.item(),
        'solve',
        'execution-2',
        solveClaim('2026-08-19T09:59:59.000Z'),
      ),
    ).rejects.toThrow(/lease expired/u);

    const record = test.records.get('work-1');
    expect(test.item().stageId).toBe('ready');
    expect(record?.claim).toBeUndefined();
    expect(record?.runtimeState).toBe('human-required');
  });

  it('refuses to run colliding high-risk work concurrently', async () => {
    // arrange
    const test = createEngine(workItem('qualified'));
    await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Analysis complete.',
      evidence: [],
      analysis: { ...readyArtifact(), collisionRisk: 'high' },
      revisions: { analysisRevision: 'abc123' },
      finishedAt: '2026-08-19T10:00:00.000Z',
    });
    // Another claimed work item already touches the same files.
    const template = test.records.get('work-1')!;
    // act
    test.records.set('work-2', {
      ...template,
      workItemId: 'work-2',
      stageId: 'progress',
      claim: {
        runId: 'execution-9',
        role: 'solve',
        owner: 'hubot',
        acquiredAt: '2026-08-19T09:50:00.000Z',
        leaseUntil: '2026-08-19T10:20:00.000Z',
        heartbeatAt: '2026-08-19T09:59:00.000Z',
        claimVersion: 1,
      },
    });

    // assert
    await expect(
      test.engine.applyClaim(test.item(), 'solve', 'execution-2', solveClaim()),
    ).rejects.toThrow(/collides with work-2/u);
    expect(test.item().stageId).toBe('ready');
  });

  it('runs work whose only collision is an abandoned claim', async () => {
    // arrange
    const test = createEngine(workItem('qualified'));
    await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Analysis complete.',
      evidence: [],
      analysis: { ...readyArtifact(), collisionRisk: 'high' },
      revisions: { analysisRevision: 'abc123' },
      finishedAt: '2026-08-19T10:00:00.000Z',
    });
    // The overlapping work item holds a claim whose lease elapsed an hour ago: its run is gone,
    // so it no longer occupies the change surface.
    const template = test.records.get('work-1')!;
    test.records.set('work-2', {
      ...template,
      workItemId: 'work-2',
      stageId: 'progress',
      claim: {
        runId: 'execution-9',
        role: 'solve',
        owner: 'hubot',
        acquiredAt: '2026-08-19T08:30:00.000Z',
        leaseUntil: '2026-08-19T09:00:00.000Z',
        heartbeatAt: '2026-08-19T08:59:00.000Z',
        claimVersion: 1,
      },
    });

    // act
    await test.engine.applyClaim(test.item(), 'solve', 'execution-2', solveClaim());

    // assert
    expect(test.item().stageId).toBe('progress');
  });

  it('releases the claim of a reported run whose transition a guard rejected', async () => {
    // arrange
    const test = createEngine(workItem('qualified'));
    // The analyze run holds a claim; `qualified` defines no claim transition, so it is mirrored
    // onto the record and stays there for the duration of the run.
    await test.engine.applyClaim(test.item(), 'analyze', 'execution-1', {
      ...solveClaim(),
      action: 'analyze' as const,
    });
    expect(test.records.get('work-1')?.claim).toBeDefined();

    // act
    await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Analysis complete.',
      evidence: [],
      analysis: { ...readyArtifact(), unresolvedQuestions: ['Which locales are in scope?'] },
      revisions: { analysisRevision: 'abc123' },
      finishedAt: '2026-08-19T10:00:00.000Z',
    });

    // assert
    const record = test.records.get('work-1');
    expect(record?.humanRequest?.reasonCode).toBe('guard-not-satisfiable');
    expect(record?.claim).toBeUndefined();
  });

  it('names the missing analysis instead of the conditions it cannot derive from one', async () => {
    // The board put the item in ready; Symphony never ran the transition that proves an
    // analysis, so every analysis-derived guard fails for one and the same reason.
    // act
    // arrange
    const test = createEngine(workItem('ready'));

    // assert
    await expect(
      test.engine.applyClaim(test.item(), 'solve', 'execution-1', solveClaim()),
    ).rejects.toThrow(
      'Work item #1 may not move to progress: No analysis is stored for this work item. The stored analysis revision is missing.',
    );

    const record = test.records.get('work-1');
    expect(record?.humanRequest?.rationale).not.toMatch(/hard dependency/u);
    expect(record?.humanRequest?.rationale).not.toMatch(/additional approval/u);
  });

  it('implements a critical risk the analysis weighed and still reported ready', async () => {
    // A critical class describes the change, not a verdict; the analysis is the only party that
    // saw both, and a critical defect is the one a team most wants fixed.
    // arrange
    const test = createEngine(workItem('qualified'));
    await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Analysis complete.',
      evidence: [],
      analysis: { ...readyArtifact(), risk: { class: 'critical', reasons: ['Touches billing.'] } },
      revisions: { analysisRevision: 'abc123' },
      finishedAt: '2026-08-19T10:00:00.000Z',
    });
    expect(test.item().stageId).toBe('ready');

    // act
    await test.engine.applyClaim(test.item(), 'solve', 'execution-2', solveClaim());

    // assert
    expect(test.item().stageId).toBe('progress');
  });

  it('refuses a critical risk the analysis did not report ready', async () => {
    // arrange
    const test = createEngine(workItem('ready'));
    const record = test.engine.ensureRecord(test.item())!;
    // act
    test.records.set('work-1', {
      ...record,
      analysis: {
        ...readyArtifact(),
        readyForSolve: false,
        risk: { class: 'critical', reasons: ['Touches billing.'] },
      },
      revisions: { analysisRevision: 'abc123' },
    });

    // assert
    await expect(
      test.engine.applyClaim(test.item(), 'solve', 'execution-2', solveClaim()),
    ).rejects.toThrow(/classifies the risk as critical/u);
  });

  it('escalates a work item whose ready stage was set outside Symphony', () => {
    // arrange
    const test = createEngine(workItem('qualified'));
    // act
    test.engine.ensureRecord(test.item());

    // assert
    expect(test.engine.reconcile([workItem('ready')])).toEqual({ adopted: 1, escalated: 1 });

    const record = test.records.get('work-1');
    expect(record?.stageId).toBe('ready');
    expect(record?.runtimeState).toBe('human-required');
    expect(record?.humanRequest?.rationale).toMatch(/moved here outside Symphony/u);
  });

  it('leaves a work item that reached ready through its own analysis untouched', async () => {
    // arrange
    const test = createEngine(workItem('qualified'));
    // act
    await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Analysis complete.',
      evidence: [],
      analysis: readyArtifact(),
      revisions: { analysisRevision: 'abc123' },
      finishedAt: '2026-08-19T10:00:00.000Z',
    });

    // assert
    expect(test.engine.reconcile([test.item()])).toEqual({ adopted: 0, escalated: 0 });
    expect(test.records.get('work-1')?.runtimeState).toBe('idle');
  });

  it('lets a person answer a supervisor question on an automated stage and resumes automation', async () => {
    // arrange
    const test = createEngine(workItem('qualified'));
    const rejected = await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Prose without the machine-readable block.',
      evidence: [],
      finishedAt: '2026-08-19T10:00:00.000Z',
    });
    // act
    const question = rejected?.humanRequest;
    // assert
    expect(question).toBeDefined();

    const answered = test.engine.answerHumanRequest(test.item(), {
      questionId: question!.id,
      option: question!.options[0]!,
      note: 'Re-run the analysis.',
      answeredBy: 'andre',
    });

    expect(answered.humanRequest).toBeUndefined();
    expect(answered.runtimeState).toBe('idle');

    // A second answer to the same question is stale and must be refused.
    expect(() =>
      test.engine.answerHumanRequest(test.item(), {
        questionId: question!.id,
        answeredBy: 'andre',
      }),
    ).toThrow(/already answered or superseded/u);
  });

  it('refuses an answer naming an option the question never offered', async () => {
    // arrange
    const test = createEngine(workItem('qualified'));
    // act
    const rejected = await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Prose without the machine-readable block.',
      evidence: [],
      finishedAt: '2026-08-19T10:00:00.000Z',
    });

    // assert
    expect(() =>
      test.engine.answerHumanRequest(test.item(), {
        questionId: rejected!.humanRequest!.id,
        option: 'Ship it anyway',
        answeredBy: 'andre',
      }),
    ).toThrow(/offers no option/u);
  });

  it('marks unanswered questions per the configured reminder and escalation deadlines', async () => {
    // arrange
    const test = createEngine(workItem('qualified'));
    // act
    await test.engine.applyRunResult(test.item(), {
      runId: 'execution-1',
      role: 'analyze',
      outcome: 'pass',
      summary: 'Prose without the machine-readable block.',
      evidence: [],
      finishedAt: '2026-08-19T10:00:00.000Z',
    });

    // assert
    expect(test.engine.remindOverdueQuestions()).toEqual({ reminded: 0, escalated: 0 });

    // Past the 48-hour reminder deadline, but before the 120-hour escalation.
    test.setNow('2026-08-21T11:00:00.000Z');
    expect(test.engine.remindOverdueQuestions()).toEqual({ reminded: 1, escalated: 0 });
    expect(test.records.get('work-1')?.humanRequest?.remindedAt).toBe('2026-08-21T11:00:00.000Z');
    // The reminder fires once, not on every maintenance tick.
    expect(test.engine.remindOverdueQuestions()).toEqual({ reminded: 0, escalated: 0 });

    test.setNow('2026-08-25T11:00:00.000Z');
    expect(test.engine.remindOverdueQuestions()).toEqual({ reminded: 0, escalated: 1 });
    expect(test.records.get('work-1')?.humanRequest?.escalatedAt).toBe('2026-08-25T11:00:00.000Z');
  });

  it('refuses to act on a work item whose board column carries no stage', async () => {
    // act
    // arrange
    const test = createEngine(workItem(undefined));

    // assert
    await expect(
      test.engine.applyHumanDecision(test.item(), {
        id: 'decision-1',
        workItemId: 'work-1',
        stageId: 'backlog',
        optionId: 'approve',
        effect: 'advance',
        decidedBy: 'operator',
        decidedAt: '2026-08-19T10:00:00.000Z',
        source: 'operator',
      }),
    ).rejects.toThrow(/not mapped to a workflow stage/u);
  });
});
