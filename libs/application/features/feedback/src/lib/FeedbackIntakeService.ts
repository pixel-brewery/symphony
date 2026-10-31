// #region Imports

import type { AutomationReceiptState } from '@symphony/domain-automation';
import type { IFeedbackIntakeSignal } from '@symphony/domain-feedback';
import type { IWorkItem } from '@symphony/domain-work';
import type { IFeedbackIntakeServiceDependencies } from './IFeedbackIntakeServiceDependencies';
import type { IFeedbackIntakeSynchronizationResult } from './IFeedbackIntakeSynchronizationResult';

// #endregion

/**
 * Converts explicitly mentioned collaboration feedback into one durable work item.
 *
 * @public
 */
export class FeedbackIntakeService {
  // #region Fields

  private _synchronization?: Promise<IFeedbackIntakeSynchronizationResult>;

  // #endregion

  // #region Ctor

  /**
   * Binds source reads, Work Item creation and durable receipt/checkpoint ownership.
   *
   * @param _dependencies - Settings and effects consumed by feedback synchronization.
   * @public
   */
  public constructor(private readonly _dependencies: IFeedbackIntakeServiceDependencies) {}

  // #endregion

  // #region Methods

  /**
   * Returns the synchronize.
   *
   * @public
   */
  public synchronize(): Promise<IFeedbackIntakeSynchronizationResult> {
    if (this._synchronization) return this._synchronization;
    const operation = this.synchronizeOnce().finally(() => {
      if (this._synchronization === operation) this._synchronization = undefined;
    });
    this._synchronization = operation;
    return operation;
  }

  private async synchronizeOnce(): Promise<IFeedbackIntakeSynchronizationResult> {
    const result: IFeedbackIntakeSynchronizationResult = {
      observed: 0,
      baselined: 0,
      created: 0,
      recovered: 0,
      deferred: 0,
      failed: 0,
    };
    const signals = [...(await this._dependencies.intake.listSignals())].sort((left, right) =>
      left.occurredAt.localeCompare(right.occurredAt),
    );
    result.observed = signals.length;
    const sources = this._dependencies.intake.listSources();
    const knownSources = new Set(
      this._dependencies.repository
        .listAutomationCheckpoints()
        .map((checkpoint) => this.sourceKey(checkpoint.workspaceId, checkpoint.sourceId)),
    );

    for (const source of sources) {
      const key = this.sourceKey(source.workspaceId, source.id);
      if (knownSources.has(key)) continue;
      for (const signal of signals.filter((candidate) => this.signalSourceKey(candidate) === key)) {
        this.save(
          signal,
          'baselined',
          'Existing Microsoft Teams feedback recorded as the intake baseline.',
        );
        result.baselined += 1;
      }
      this._dependencies.repository.saveAutomationCheckpoint({
        sourceId: source.id,
        workspaceId: source.workspaceId,
        initializedAt: this._dependencies.clock.now(),
      });
      knownSources.add(key);
    }

    const knownItems = [
      ...(await (this._dependencies.tracker.listAutomationWorkItems?.() ??
        this._dependencies.tracker.listWorkItems())),
    ];
    for (const signal of signals) {
      const existingReceipt = this._dependencies.repository
        .listAutomationReceipts()
        .find((receipt) => receipt.signalId === signal.id);
      if (existingReceipt && terminalStates.has(existingReceipt.state)) continue;
      const existingItem = knownItems.find((item) => item.body.includes(signal.marker));
      if (existingItem) {
        this.save(
          signal,
          'completed',
          'Recovered the existing work item for this Teams feedback.',
          existingItem.id,
        );
        result.recovered += 1;
        continue;
      }
      await this.process(signal, knownItems, result);
    }
    return result;
  }

  private async process(
    signal: IFeedbackIntakeSignal,
    knownItems: IWorkItem[],
    result: IFeedbackIntakeSynchronizationResult,
  ): Promise<void> {
    this.save(signal, 'processing', 'Microsoft Teams feedback accepted for work-item creation.');
    try {
      const settings = this._dependencies.settings();
      const repository = settings.repositoryBindings.find(
        (candidate) =>
          candidate.id === signal.targetRepositoryBindingId &&
          candidate.workspaceId === signal.workspaceId &&
          candidate.enabled,
      );
      const source = settings.workItemSources.find(
        (candidate) =>
          candidate.id === signal.targetWorkItemSourceId &&
          candidate.workspaceId === signal.workspaceId &&
          candidate.provider === 'github-projects' &&
          candidate.enabled,
      );
      if (!repository || !source) {
        throw new Error('The configured GitHub Project or repository is unavailable.');
      }
      const targetRepository = `${repository.owner}/${repository.name}`;
      const draft = await this._dependencies.workItems.draft({
        operationId: signal.id.slice(0, 200),
        workspaceId: signal.workspaceId,
        repository: targetRepository,
        prompt: signal.prompt,
        title: signal.title,
      });
      const sourceDetails = [
        '',
        '## Source',
        `Imported from Microsoft Teams${signal.actor ? ` after a request by ${signal.actor}` : ''}.`,
        ...(signal.externalUrl ? [`[Open the source conversation](${signal.externalUrl})`] : []),
        '',
        signal.marker,
      ].join('\n');
      const created = await this._dependencies.workItems.create({
        workspaceId: signal.workspaceId,
        sourceId: source.id,
        title: draft.title,
        body: `${draft.body.trim()}\n${sourceDetails}`,
        repository: targetRepository,
        repositoryBindingIds: [repository.id],
        projectFields: draft.projectFields,
        labels: draft.labels,
        assignees: draft.assignees,
      });
      knownItems.push(created);
      this.save(
        signal,
        'completed',
        'Created the GitHub work item from Microsoft Teams feedback.',
        created.id,
      );
      result.created += 1;
    } catch (cause) {
      const message = this.safeMessage(cause);
      if (this.isRetryable(message)) {
        this.save(signal, 'deferred', message);
        result.deferred += 1;
        return;
      }
      this.save(signal, 'failed', message);
      result.failed += 1;
    }
  }

  private save(
    signal: IFeedbackIntakeSignal,
    state: AutomationReceiptState,
    message: string,
    workItemId?: string,
  ): void {
    const now = this._dependencies.clock.now();
    const existing = this._dependencies.repository
      .listAutomationReceipts()
      .find((receipt) => receipt.signalId === signal.id);
    this._dependencies.repository.saveAutomationReceipt({
      signalId: signal.id,
      sourceId: signal.sourceId,
      workspaceId: signal.workspaceId,
      workItemId: workItemId ?? `teams-feedback:${signal.id}`,
      action: 'synchronize',
      state,
      observedAt: existing?.observedAt ?? now,
      updatedAt: now,
      message,
    });
  }

  private safeMessage(cause: unknown): string {
    const message = cause instanceof Error ? cause.message : 'Feedback intake failed.';
    return message.slice(0, 2_000);
  }

  private isRetryable(message: string): boolean {
    return /temporarily unavailable|timed out|rate limit|connection reset|network|fetch failed/iu.test(
      message,
    );
  }

  private signalSourceKey(signal: IFeedbackIntakeSignal): string {
    return this.sourceKey(signal.workspaceId, signal.sourceId);
  }

  private sourceKey(workspaceId: string, sourceId: string): string {
    return `${workspaceId}:${sourceId}`;
  }

  // #endregion
}

const terminalStates = new Set<AutomationReceiptState>([
  'baselined',
  'completed',
  'ignored',
  'failed',
]);
