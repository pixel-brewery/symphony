// #region Imports

import type { IPullRequestCollectionPort } from '@symphony/application-delivery';
import type { IPullRequestDeliveryPort } from '@symphony/application-execution';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type {
  IPullRequestReference,
  IPullRequestStatus,
  IPullRequestSummary,
} from '@symphony/domain-delivery';
import type { IWorkItem } from '@symphony/domain-work';
import { setTimeout as delay } from 'node:timers/promises';

// #endregion

interface IPublishedSimulatedPullRequest {
  readonly execution: IExecutionRecord;
  readonly workItem: IWorkItem;
  readonly scriptKey: string;
  readonly workspaceId: string;
  readonly repositoryBindingId: string;
  readonly number: number;
  readonly title: string;
  readonly sourceBranch: string;
  readonly targetBranch: string;
  readonly externalUrl: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export class SimulatedPullRequestDelivery
  implements IPullRequestDeliveryPort, IPullRequestCollectionPort
{
  // #region Fields

  private readonly _baseBranchStatuses: readonly NonNullable<
    IPullRequestStatus['baseBranchStatus']
  >[];
  private readonly _inspectionCursors = new Map<string, number>();
  private readonly _forcedCurrent = new Set<string>();
  private readonly _updateCounts = new Map<string, number>();
  private readonly _publishedPullRequests = new Map<string, IPublishedSimulatedPullRequest>();

  // #endregion

  // #region Ctor

  public constructor(baseBranchStatusScript = 'current') {
    const entries = baseBranchStatusScript
      .split(',')
      .map((entry) => entry.trim())
      .filter((entry) => entry.length > 0)
      .map((entry) => {
        if (
          entry !== 'current' &&
          entry !== 'behind' &&
          entry !== 'conflicting' &&
          entry !== 'unknown'
        ) {
          throw new Error(`Unknown simulated base-branch status: ${entry}`);
        }
        return entry;
      });
    this._baseBranchStatuses = entries.length > 0 ? entries : ['current'];
  }

  // #endregion

  // #region Methods

  /**
   * Publishes the pull request.
   *
   * @param execution - Execution.
   * @param workItem - Work item.
   * @public
   */
  public async publishPullRequest(
    execution: IExecutionRecord,
    workItem: IWorkItem,
  ): Promise<IPullRequestReference> {
    await delay(120);
    const branch = execution.workspaceReference;
    if (!branch) throw new Error('The simulated implementation has no branch.');
    const repository = workItem.repository.includes('/') ? workItem.repository : 'example/platform';
    const reference: IPullRequestReference = {
      number: Number(workItem.externalId.replace(/\D/gu, '')) || 1,
      externalUrl: `https://github.com/${repository}/pull/1`,
      branchUrl: `https://github.com/${repository}/tree/${branch.split('/').map(encodeURIComponent).join('/')}`,
    };
    this.recordPublishedPullRequest(execution, workItem, reference);
    return reference;
  }

  /**
   * Lists every pull request this adapter has published, newest update first.
   *
   * @public
   */
  public async listPullRequests(): Promise<readonly IPullRequestSummary[]> {
    return [...this._publishedPullRequests.values()]
      .map((published) => this.summarize(published))
      .toSorted((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  }

  /**
   * Advances one listed pull-request branch to the current base revision.
   *
   * Mirrors the cloud provider: a current branch returns unchanged, a conflicting or
   * still-calculating branch is rejected, and a successful update makes the next observed
   * base-branch status `current`.
   *
   * @param repositoryBindingId - Repository binding id.
   * @param pullRequestNumber - Pull request number.
   * @public
   */
  public async updateListedPullRequestBranch(
    repositoryBindingId: string,
    pullRequestNumber: number,
  ): Promise<IPullRequestSummary> {
    const published = this._publishedPullRequests.get(
      `${repositoryBindingId}:${pullRequestNumber}`,
    );
    if (!published) {
      throw new Error('The selected pull request has no simulated managed branch.');
    }
    const baseBranchStatus = this.peekBaseBranchStatus(published.scriptKey);
    if (baseBranchStatus === 'current') return this.summarize(published);
    if (baseBranchStatus === 'conflicting') {
      throw new Error('Resolve the pull-request branch conflicts before updating it.');
    }
    if (baseBranchStatus !== 'behind') {
      throw new Error('GitHub has not finished calculating the pull-request branch status.');
    }
    await this.updatePullRequestBranch(
      published.execution,
      published.workItem,
      this.headCommitSha(published.scriptKey),
    );
    const updated: IPublishedSimulatedPullRequest = {
      ...published,
      updatedAt: new Date().toISOString(),
    };
    this._publishedPullRequests.set(`${repositoryBindingId}:${pullRequestNumber}`, updated);
    return this.summarize(updated);
  }

  /**
   * Inspects the pull request.
   *
   * @param execution - Execution.
   * @param workItem - Work item.
   * @public
   */
  public async inspectPullRequest(
    execution: IExecutionRecord,
    workItem: IWorkItem,
  ): Promise<IPullRequestStatus> {
    await delay(40);
    const key = this.pullRequestKey(execution, workItem);
    return {
      state: 'open',
      draft: false,
      headCommitSha: this.headCommitSha(key),
      baseBranchStatus: this.nextBaseBranchStatus(key),
      ...(execution.workspaceReference ? { sourceBranch: execution.workspaceReference } : {}),
      targetBranch: 'main',
    };
  }

  /**
   * Advances one simulated pull-request branch to the current base revision.
   *
   * @param execution - Execution that owns the retained managed branch.
   * @param workItem - Work item that resolves the repository binding.
   * @param expectedHeadCommitSha - Head observed immediately before the update.
   * @public
   */
  public async updatePullRequestBranch(
    execution: IExecutionRecord,
    workItem: IWorkItem,
    expectedHeadCommitSha: string,
  ): Promise<void> {
    await delay(40);
    if (!execution.pullRequest || !execution.workspaceReference) {
      throw new Error('The execution has no managed pull-request branch to update.');
    }
    const key = this.pullRequestKey(execution, workItem);
    const currentHead = this.headCommitSha(key);
    if (expectedHeadCommitSha !== currentHead) {
      throw new Error(
        `The expected head sha ${expectedHeadCommitSha} did not match the current head ref ${currentHead}.`,
      );
    }
    this._updateCounts.set(key, (this._updateCounts.get(key) ?? 0) + 1);
    this._forcedCurrent.add(key);
  }

  private recordPublishedPullRequest(
    execution: IExecutionRecord,
    workItem: IWorkItem,
    reference: IPullRequestReference,
  ): void {
    const workspaceId =
      execution.workspaceId ?? execution.bindingSnapshot?.workspaceId ?? workItem.workspaceId;
    const repositoryBindingId =
      execution.bindingSnapshot?.repositoryBindingIds[0] ?? workItem.repositoryBindingIds?.[0];
    if (!workspaceId || !repositoryBindingId || !execution.workspaceReference) return;
    const delivered: IExecutionRecord = { ...execution, pullRequest: reference };
    const repository = workItem.repository.includes('/') ? workItem.repository : 'example/platform';
    const key = `${repositoryBindingId}:${reference.number}`;
    const now = new Date().toISOString();
    this._publishedPullRequests.set(key, {
      execution: delivered,
      workItem,
      scriptKey: this.pullRequestKey(delivered, workItem),
      workspaceId,
      repositoryBindingId,
      number: reference.number,
      title: workItem.title,
      sourceBranch: execution.workspaceReference,
      targetBranch: 'main',
      externalUrl: `https://github.com/${repository}/pull/${reference.number}`,
      createdAt: this._publishedPullRequests.get(key)?.createdAt ?? now,
      updatedAt: now,
    });
  }

  private summarize(published: IPublishedSimulatedPullRequest): IPullRequestSummary {
    return {
      id: `${published.repositoryBindingId}:${published.number}`,
      workspaceId: published.workspaceId,
      repositoryBindingId: published.repositoryBindingId,
      number: published.number,
      title: published.title,
      state: 'open',
      draft: false,
      sourceBranch: published.sourceBranch,
      targetBranch: published.targetBranch,
      baseBranchStatus: this.peekBaseBranchStatus(published.scriptKey),
      // Deterministic review requests: odd numbers ask the simulated developer, even numbers a
      // teammate, so a scope signed in as `local-developer` sees some but not all of them.
      requestedReviewers: [published.number % 2 ? 'local-developer' : 'simulated-teammate'],
      externalUrl: published.externalUrl,
      createdAt: published.createdAt,
      updatedAt: published.updatedAt,
    };
  }

  private peekBaseBranchStatus(key: string): NonNullable<IPullRequestStatus['baseBranchStatus']> {
    if (this._forcedCurrent.has(key)) return 'current';
    const cursor = this._inspectionCursors.get(key) ?? 0;
    const index = Math.min(cursor, this._baseBranchStatuses.length - 1);
    return this._baseBranchStatuses[index] ?? 'current';
  }

  private headCommitSha(key: string): string {
    const updates = this._updateCounts.get(key) ?? 0;
    return updates === 0 ? 'simulated-head' : `simulated-head-updated-${updates}`;
  }

  private nextBaseBranchStatus(key: string): NonNullable<IPullRequestStatus['baseBranchStatus']> {
    if (this._forcedCurrent.delete(key)) return 'current';
    const cursor = this._inspectionCursors.get(key) ?? 0;
    const index = Math.min(cursor, this._baseBranchStatuses.length - 1);
    this._inspectionCursors.set(key, cursor + 1);
    return this._baseBranchStatuses[index] ?? 'current';
  }

  private pullRequestKey(execution: IExecutionRecord, workItem: IWorkItem): string {
    const repository = workItem.repository.includes('/') ? workItem.repository : 'example/platform';
    const number =
      execution.pullRequest?.number ?? (Number(workItem.externalId.replace(/\D/gu, '')) || 1);
    return `${repository}#${number}`;
  }

  // #endregion
}
