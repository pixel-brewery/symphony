// #region Imports

import type { IWorkflowRecord } from '@symphony/domain-workflow';
import type { IWorkItem } from '@symphony/domain-work';
import { findStage } from '@symphony/domain-workflow';
import type { IWorkflowMaintenanceDependencies } from './IWorkflowMaintenanceDependencies';
import type { IWorkflowMaintenanceResult } from './IWorkflowMaintenanceResult';

// #endregion

/**
 * The consumer of the supervisor's deferred states.
 *
 * The engine writes `retry-wait` with a backoff schedule and `blocked` with the blocking
 * work items; this service is what makes those states end: a due retry restarts the failed
 * role no earlier than its scheduled time, and a blocked item resumes automatically once
 * every named blocker reached a terminal stage. Anything it cannot resume safely escalates
 * to a person instead of waiting forever.
 */
export class WorkflowMaintenanceService {
  // #region Ctor

  public constructor(private readonly _dependencies: IWorkflowMaintenanceDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Runs the once.
   *
   * @public
   */
  public async runOnce(): Promise<IWorkflowMaintenanceResult> {
    const result: IWorkflowMaintenanceResult = {
      held: 0,
      resumedRetries: 0,
      resumedBlocked: 0,
      escalated: 0,
      deferred: 0,
      remindedQuestions: 0,
      escalatedQuestions: 0,
      reconciledStages: 0,
    };
    const items = await this._dependencies.listWorkItems();
    // Board and record are compared every pass, so a drifted stage heals without waiting for
    // the next run or decision on that item.
    const reconciled = this._dependencies.engine.reconcile(items);
    result.reconciledStages = reconciled.adopted;
    result.escalated += reconciled.escalated;
    const overdue = this._dependencies.engine.remindOverdueQuestions();
    result.remindedQuestions = overdue.reminded;
    result.escalatedQuestions = overdue.escalated;
    const held = this._dependencies.engine.heldRecords();
    result.held = held.length;
    if (!held.length) return result;
    const byId = new Map(items.map((item) => [item.id, item]));
    const byExternalId = new Map(items.map((item) => [item.externalId, item]));
    const now = new Date(this._dependencies.clock.now()).getTime();

    for (const record of held) {
      const item = byId.get(record.workItemId);
      if (!item) continue;
      if (record.runtimeState === 'retry-wait') {
        const dueAt = record.routing.nextRetryAt
          ? new Date(record.routing.nextRetryAt).getTime()
          : Number.NaN;
        // A schedule that cannot be read must not turn into an immediate hot loop.
        if (Number.isNaN(dueAt)) {
          this._dependencies.engine.escalateHeld(
            item,
            `How should ${item.externalId} continue?`,
            'The scheduled retry time is unreadable, so the retry cannot be scheduled safely.',
          );
          result.escalated += 1;
          continue;
        }
        if (dueAt > now) continue;
        if (!this._dependencies.capacityAvailable()) {
          result.deferred += 1;
          continue;
        }
        if (await this.resume(record, item, 'The scheduled retry fell due.')) {
          result.resumedRetries += 1;
        } else {
          result.escalated += 1;
        }
        continue;
      }

      const blockers = record.routing.blockingWorkItemIds ?? [];
      const unknown = blockers.filter(
        (blocker) => !byId.has(blocker) && !byExternalId.has(blocker),
      );
      if (unknown.length) {
        this._dependencies.engine.escalateHeld(
          item,
          `How should ${item.externalId} continue?`,
          `The blocking work item ${unknown.join(', ')} no longer exists, so the blocker cannot resolve on its own.`,
        );
        result.escalated += 1;
        continue;
      }
      const unresolved = blockers.filter((blocker) => {
        const blocking = byId.get(blocker) ?? byExternalId.get(blocker);
        return blocking ? !this.isTerminal(blocking) : true;
      });
      if (unresolved.length) continue;
      if (!this._dependencies.capacityAvailable()) {
        result.deferred += 1;
        continue;
      }
      if (await this.resume(record, item, 'Every blocking work item is resolved.')) {
        result.resumedBlocked += 1;
      } else {
        result.escalated += 1;
      }
    }
    return result;
  }

  /** Restores the record and restarts the held role; a failing start escalates visibly. */
  private async resume(record: IWorkflowRecord, item: IWorkItem, reason: string): Promise<boolean> {
    const role = record.routing.resumeRole;
    if (role !== 'analyze' && role !== 'solve') {
      this._dependencies.engine.escalateHeld(
        item,
        `How should ${item.externalId} continue?`,
        `The held ${role ?? 'unknown'} step cannot be restarted automatically.`,
      );
      return false;
    }
    this._dependencies.engine.resumeHeld(item, reason);
    try {
      if (role === 'analyze') {
        await this._dependencies.executions.startForWorkItem(item, undefined, {
          origin: 'workflow',
        });
      } else {
        await this._dependencies.executions.startSolutionForWorkItem(item, undefined, {
          origin: 'workflow',
        });
      }
      return true;
    } catch (cause) {
      this._dependencies.engine.escalateHeld(
        item,
        `How should ${item.externalId} continue?`,
        `The scheduled resumption could not start: ${
          cause instanceof Error ? cause.message : 'unknown start failure'
        }`,
      );
      return false;
    }
  }

  private isTerminal(item: IWorkItem): boolean {
    if (!item.stageId) return false;
    return findStage(this._dependencies.workflow().stages, item.stageId)?.kind === 'terminal';
  }

  // #endregion
}
