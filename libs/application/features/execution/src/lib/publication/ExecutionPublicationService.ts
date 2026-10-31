// #region Imports

import type {
  IExecutionRecord,
  IGoalRecord,
  IGoalReviewDecision,
} from '@symphony/domain-execution';
import type { IWorkItem, IWorkItemNote, IWorkItemNoteDetail } from '@symphony/domain-work';
import { noteSubjects } from './NoteSubjects';
import { reviewDecisionLabels } from '../goals/ReviewDecisionLabels';
import type { IExecutionPublication } from './IExecutionPublication';
import type { IExecutionPublicationDependencies } from './IExecutionPublicationDependencies';

// #endregion

/** Publishes implementation pull requests and Work Item notes. @public */
export class ExecutionPublicationService implements IExecutionPublication {
  // #region Fields

  private readonly _publishingPullRequests = new Set<string>();

  // #endregion

  // #region Ctor

  public constructor(private readonly _dependencies: IExecutionPublicationDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Publishes the pull request.
   *
   * @param executionId - Execution id.
   * @public
   */
  public async publishPullRequest(executionId: string): Promise<IExecutionRecord> {
    if (this._publishingPullRequests.has(executionId)) {
      throw new Error('A pull request is already being created for this implementation.');
    }
    const delivery = this._dependencies.delivery;
    if (!delivery) throw new Error('Pull-request delivery is not available.');
    const execution = this._dependencies.repository
      .listExecutions()
      .find((candidate) => candidate.id === executionId);
    if (!execution) throw new Error(`Unknown execution: ${executionId}`);
    if (execution.pullRequest) return execution;
    if (
      execution.state !== 'succeeded' ||
      (execution.kind !== 'solution' && execution.kind !== 'revision')
    ) {
      throw new Error('Only a completed implementation can be delivered as a pull request.');
    }
    if (!execution.workspacePath || !execution.workspaceReference) {
      throw new Error('The implementation has no managed Git branch to deliver.');
    }
    if (!(await this._dependencies.workspace.isAvailable(execution.workspacePath))) {
      throw new Error('The managed implementation workspace is no longer available.');
    }
    const workItem =
      execution.workItemSnapshot ??
      (await this._dependencies.remoteProjectionQueries.loadOperationalWorkItems()).find(
        (candidate) => candidate.id === execution.workItemId,
      );
    if (!workItem) throw new Error(`Unknown work item: ${execution.workItemId}`);

    this._publishingPullRequests.add(executionId);
    try {
      const pullRequest = await delivery.publishPullRequest(execution, workItem);
      const delivered = { ...execution, pullRequest };
      this._dependencies.repository.saveExecution(delivered);
      if (execution.deliveryGroupId) {
        await this._dependencies.synchronizeDeliveryGroupPullRequest(
          execution,
          workItem,
          pullRequest,
        );
      }
      await this._dependencies.record(
        execution.id,
        'pull-request.created',
        `Pull request #${pullRequest.number} created.`,
      );
      await this.publishNote(workItem, delivered.id, {
        kind: 'delivery',
        heading: 'Symphony pull request',
        body: `The managed implementation branch was delivered as pull request #${pullRequest.number}.`,
        details: this.deliveryDetails(delivered),
      });
      return delivered;
    } finally {
      this._publishingPullRequests.delete(executionId);
    }
  }

  /** Publishes the already durable human acceptance decision. @public */
  /**
   * Publishes the human acceptance decision on the ticket.
   *
   * The item is resolved from the operational projection because a goal carries only its
   * identifier. A projection that cannot be read leaves the decision unpublished rather than
   * failing a decision that is already durable.
   */
  public async publishAcceptanceNote(
    goal: IGoalRecord,
    review: IGoalReviewDecision,
  ): Promise<void> {
    if (!this._dependencies.tracker.publishWorkItemNote) return;
    const item = await this.loadOperationalWorkItems()
      .then((items) => items.find((candidate) => candidate.id === goal.workItemId))
      .catch(() => undefined);
    if (!item) return;
    await this.publishNote(item, goal.currentExecutionId, {
      kind: 'acceptance',
      heading: 'Symphony acceptance',
      body: review.message || 'No further remarks were recorded.',
      details: [{ label: 'Decision', value: reviewDecisionLabels[review.decision] }],
    });
  }

  /** Normalizes immediate query failures into the best-effort read promise. */
  private async loadOperationalWorkItems(): Promise<readonly IWorkItem[]> {
    return this._dependencies.remoteProjectionQueries.loadOperationalWorkItems();
  }

  /** Publishes a run note while retaining provider failures on the event stream. @public */
  /**
   * Writes a completed step onto the tracked item.
   *
   * A result is what everyone following the ticket needs, so it belongs on the ticket and not
   * only in the local run history. Publishing is best effort: a tracker that cannot carry notes,
   * and a write that fails, never turn a succeeded step into a failed one - the failure is
   * recorded on the run stream instead. A note without an owning execution, such as an
   * acceptance decision on a goal that never ran, is dropped silently for lack of a stream.
   */
  public async publishNote(
    item: IWorkItem,
    executionId: string | undefined,
    note: IWorkItemNote,
  ): Promise<void> {
    const tracker = this._dependencies.tracker;
    if (!tracker.publishWorkItemNote) return;
    try {
      await tracker.publishWorkItemNote(item, note);
    } catch (cause) {
      if (!executionId) return;
      // A note that did not reach the tracker is a gap in the record, not the end of the run:
      // reported as a failure it would flip a finished execution to "failed" for every reader.
      await this._dependencies.record(
        executionId,
        'execution.warning',
        `The ${noteSubjects[note.kind]} could not be published on ${item.externalId}: ${
          cause instanceof Error ? cause.message : 'unknown work-tracker error'
        }`,
      );
    }
  }

  /** Projects the implementation result into a provider-neutral Work Item note. @public */
  public implementationNote(execution: IExecutionRecord, summary: string): IWorkItemNote {
    const details = this.deliveryDetails(execution);
    return {
      kind: 'implementation',
      heading: execution.kind === 'revision' ? 'Symphony revision' : 'Symphony implementation',
      body: summary,
      ...(details.length ? { details } : {}),
    };
  }

  /**
   * Where the change itself can be read.
   *
   * A managed branch only becomes addressable once it is pushed with its pull request, so an
   * implementation that has not been delivered yet contributes its branch name without a link
   * rather than an address that resolves to nothing.
   */
  private deliveryDetails(execution: IExecutionRecord): readonly IWorkItemNoteDetail[] {
    const details: IWorkItemNoteDetail[] = [];
    if (execution.pullRequest) {
      details.push({
        label: 'Pull request',
        value: `#${execution.pullRequest.number}`,
        url: execution.pullRequest.externalUrl,
      });
    }
    if (execution.workspaceReference) {
      details.push({
        label: 'Branch',
        value: execution.workspaceReference,
        ...(execution.pullRequest?.branchUrl ? { url: execution.pullRequest.branchUrl } : {}),
      });
    }
    return details;
  }

  // #endregion
}
