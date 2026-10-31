// #region Imports

import type { IExecutionRecord } from '@symphony/domain-execution';
import type { IManualExecutions } from './IManualExecutions';
import type { IManualExecutionsDependencies } from './IManualExecutionsDependencies';

// #endregion

/** Records operator-supplied analysis and implementation evidence. @public */
export class ManualExecutionService implements IManualExecutions {
  // #region Ctor

  public constructor(private readonly _dependencies: IManualExecutionsDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Completes the manual analysis.
   *
   * @param workItemId - Work item id.
   * @param summary - Summary.
   * @public
   */
  public async completeManualAnalysis(
    workItemId: string,
    summary: string,
  ): Promise<IExecutionRecord> {
    const items = await this._dependencies.remoteProjectionQueries.loadOperationalWorkItems();
    const summaryItem = items.find((candidate) => candidate.id === workItemId);
    if (!summaryItem) throw new Error(`Unknown work item: ${workItemId}`);
    const item = await this._dependencies.remoteProjectionQueries.loadWorkItemDetails(
      summaryItem.id,
    );
    this._dependencies.assertStageAllowsRole(item, 'analyze');
    this._dependencies.assertNoActiveExecution(item);
    const normalizedSummary = summary.trim();
    if (!normalizedSummary) throw new Error('Enter the manual analysis before completing it.');
    const executionScope = this._dependencies.executionScope(item, 'analysis');

    const now = this._dependencies.clock.now();
    const execution: IExecutionRecord = {
      id: this._dependencies.ids.next('execution'),
      ...executionScope,
      workItemId: item.id,
      workflowId: this._dependencies.catalog.workflow().id,
      mode: 'manual',
      kind: 'analysis',
      state: 'succeeded',
      startedAt: now,
      finishedAt: now,
      summary: normalizedSummary,
    };
    this._dependencies.repository.saveExecution(execution);
    // A manual note is a completed step like any other, so it routes through the supervisor.
    await this._dependencies.reportRunResult(item, 'analyze', execution, 'pass', normalizedSummary);
    const manualGoal = this._dependencies.goalForWorkItem(item.id);
    if (manualGoal) {
      this._dependencies.recordManualAnalysisGoal(manualGoal, execution, normalizedSummary, now);
    }
    await this._dependencies.record(
      execution.id,
      'execution.started',
      `Manual analysis recorded for ${item.externalId}.`,
    );
    await this._dependencies.record(execution.id, 'analysis.completed', normalizedSummary);
    await this._dependencies.publishNote(item, execution.id, {
      kind: 'analysis',
      heading: 'Symphony analysis',
      body: normalizedSummary,
    });
    return execution;
  }

  /**
   * Completes the manual solution.
   *
   * @param workItemId - Work item id.
   * @param summary - Summary.
   * @public
   */
  public async completeManualSolution(
    workItemId: string,
    summary: string,
  ): Promise<IExecutionRecord> {
    const items = await this._dependencies.remoteProjectionQueries.loadOperationalWorkItems();
    const summaryItem = items.find((candidate) => candidate.id === workItemId);
    if (!summaryItem) throw new Error(`Unknown work item: ${workItemId}`);
    const item = await this._dependencies.remoteProjectionQueries.loadWorkItemDetails(
      summaryItem.id,
    );
    this._dependencies.assertStageAllowsRole(item, 'solve');
    this._dependencies.assertNoActiveExecution(item);
    const normalizedSummary = summary.trim();
    if (!normalizedSummary) {
      throw new Error('Enter the manual implementation or rework notes before completing it.');
    }

    const executions = this._dependencies.repository
      .listExecutions()
      .filter((execution) => execution.workItemId === item.id);
    const analysis = [...executions]
      .filter(
        (execution) =>
          (execution.kind === undefined || execution.kind === 'analysis') &&
          (execution.skillFlowRole === undefined || execution.skillFlowRole === 'analysis') &&
          execution.state === 'succeeded' &&
          execution.summary,
      )
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
      .at(-1);
    if (!analysis?.summary) {
      throw new Error('Complete an analysis before recording an implementation.');
    }
    const previousSolution = [...executions]
      .filter(
        (execution) =>
          (execution.kind === 'solution' || execution.kind === 'revision') &&
          execution.state === 'succeeded',
      )
      .sort((left, right) => left.startedAt.localeCompare(right.startedAt))
      .at(-1);
    const executionScope = this._dependencies.executionScope(item, 'solution');

    const now = this._dependencies.clock.now();
    const execution: IExecutionRecord = {
      id: this._dependencies.ids.next('execution'),
      ...executionScope,
      workItemId: item.id,
      workflowId: this._dependencies.catalog.workflow().id,
      mode: 'manual',
      kind: previousSolution ? 'revision' : 'solution',
      parentExecutionId: previousSolution?.id ?? analysis.id,
      state: 'succeeded',
      startedAt: now,
      finishedAt: now,
      summary: normalizedSummary,
    };
    this._dependencies.repository.saveExecution(execution);
    const manualGoal = this._dependencies.goalForWorkItem(item.id);
    if (manualGoal) {
      const verificationReport = {
        id: this._dependencies.ids.next('verification'),
        executionId: execution.id,
        recordedAt: now,
        state: 'failed' as const,
        changedFiles: [],
        diffLines: 0,
        checks: [{ label: 'Managed implementation evidence', state: 'failed' as const }],
        message:
          'Manual implementation notes do not provide a managed worktree diff or deterministic verification evidence.',
      };
      this._dependencies.recordManualSolutionGoal(manualGoal, execution, verificationReport, now);
    }
    await this._dependencies.record(
      execution.id,
      'solution.started',
      previousSolution
        ? `Manual rework recorded for ${item.externalId}.`
        : `Manual implementation recorded for ${item.externalId}.`,
    );
    await this._dependencies.record(execution.id, 'solution.completed', normalizedSummary);
    await this._dependencies.publishNote(
      item,
      execution.id,
      this._dependencies.implementationNote(execution, normalizedSummary),
    );
    return execution;
  }

  // #endregion
}
