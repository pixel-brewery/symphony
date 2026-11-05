// #region Imports

import { Inject, inject, Injectable, signal, type Signal } from '@angular/core';
import type { IDeliveryOperations } from '@symphony/frontend-core/delivery-operations';
import { NotificationService, operatorErrorMessage } from '@symphony/frontend-notification';
import type {
  PullRequestBranchInventoryDto,
  PullRequestComparisonDto,
  PullRequestSummaryDto,
} from '@symphony/ipc-contracts-delivery';
import type { RequestPayload } from '@symphony/ipc-contracts-composition';
import type { IDeliveryClient } from '../ports/IDeliveryClient';
import type { IDeliveryProjection } from '../ports/IDeliveryProjection';
import { DELIVERY_CLIENT } from '../ports/DeliveryClientToken';
import { DELIVERY_PROJECTION } from '../ports/DeliveryProjectionToken';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/** Owns pull-request comparison, creation, and branch-update operations. */
@Injectable()
export class PullRequestStore implements IDeliveryOperations {
  // #region Fields

  private readonly _client: IDeliveryClient;
  private readonly _projection: IDeliveryProjection;
  private readonly _notifications: Pick<NotificationService, 'showSuccess' | 'showError'>;
  private readonly _pullRequestBusy = signal(false);
  private readonly _pullRequestBranchUpdatingId = signal<string | undefined>(undefined);
  private readonly _publicPullRequestBusy = this._pullRequestBusy.asReadonly();
  private readonly _publicPullRequestBranchUpdatingId =
    this._pullRequestBranchUpdatingId.asReadonly();

  // #endregion

  // #region Ctor

  /**
   * Constructs the pull-request store.
   *
   * @public
   */
  public constructor(
    @Inject(DELIVERY_CLIENT) client: IDeliveryClient = inject(DELIVERY_CLIENT),
    @Inject(DELIVERY_PROJECTION) projection: IDeliveryProjection = inject(DELIVERY_PROJECTION),
    @Inject(NotificationService)
    notifications: Pick<NotificationService, 'showSuccess' | 'showError'> = inject(
      NotificationService,
    ),
  ) {
    this._client = client;
    this._projection = projection;
    this._notifications = notifications;
  }

  // #endregion

  // #region Properties

  /** The shared exclusion between operator creation and execution publication. @public @readonly */
  public get pullRequestBusy(): Signal<boolean> {
    return this._publicPullRequestBusy;
  }
  /** The existing branch-update exclusion and busy identity. @public @readonly */
  public get pullRequestBranchUpdatingId(): Signal<string | undefined> {
    return this._publicPullRequestBranchUpdatingId;
  }

  // #endregion

  // #region Methods

  /**
   * Branches the repository offers as the source or the target of a new pull request.
   *
   * @param repositoryBindingId - Repository binding id.
   * @public
   */
  public async loadPullRequestBranches(
    repositoryBindingId: string,
  ): Promise<PullRequestBranchInventoryDto | undefined> {
    try {
      return await this._client.request('pull-request.branches', { repositoryBindingId });
    } catch (cause) {
      this.showError(
        cause,
        translateLabel('loc.symphony.labels.unable.to.load.the.repository.branches.7184a6a'),
      );
      return undefined;
    }
  }

  /**
   * Compares the chosen branches so the operator sees what a pull request would carry.
   *
   * @param input - Input.
   * @public
   */
  public async comparePullRequestBranches(
    input: RequestPayload<'pull-request.compare'>,
  ): Promise<PullRequestComparisonDto | undefined> {
    try {
      return await this._client.request('pull-request.compare', input);
    } catch (cause) {
      this.showError(
        cause,
        translateLabel('loc.symphony.labels.unable.to.compare.the.selected.branches.3c409d9'),
      );
      return undefined;
    }
  }

  /**
   * Opens an operator-authored pull request. The created pull request enters the projection
   * immediately so the list reflects it before the next provider refresh.
   *
   * @param draft - Draft.
   * @public
   */
  public async createPullRequest(
    draft: RequestPayload<'pull-request.create'>,
  ): Promise<PullRequestSummaryDto | undefined> {
    if (this._pullRequestBusy()) return undefined;
    this._pullRequestBusy.set(true);
    try {
      const created = await this._client.request('pull-request.create', draft);
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              pullRequests: [
                created,
                ...(snapshot.pullRequests ?? []).filter(
                  (pullRequest) => pullRequest.id !== created.id,
                ),
              ],
            }
          : snapshot,
      );
      this._notifications.showSuccess(
        translateLabel('loc.symphony.labels.pull.request.created.b67b9db'),
        translateLabel('loc.symphony.labels.pr.is.open.on.github.516aec3', created.number),
      );
      return created;
    } catch (cause) {
      this.showError(
        cause,
        translateLabel('loc.symphony.labels.unable.to.create.the.pull.request.8093f5b'),
      );
      return undefined;
    } finally {
      this._pullRequestBusy.set(false);
    }
  }

  /**
   * Updates the pull-request branch with the latest target-branch revision.
   *
   * @param pullRequest - Pull request.
   * @public
   */
  public async updatePullRequestBranch(pullRequest: PullRequestSummaryDto): Promise<boolean> {
    if (this._pullRequestBranchUpdatingId()) return false;
    this._pullRequestBranchUpdatingId.set(pullRequest.id);
    try {
      const updated = await this._client.request('pull-request.update-branch', {
        repositoryBindingId: pullRequest.repositoryBindingId,
        pullRequestNumber: pullRequest.number,
      });
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              pullRequests: (snapshot.pullRequests ?? []).map((candidate) =>
                candidate.id === updated.id ? updated : candidate,
              ),
            }
          : snapshot,
      );
      this._notifications.showSuccess(
        translateLabel('loc.symphony.labels.pull.request.branch.is.up.to.date.9c7f36c'),
        translateLabel(
          'loc.symphony.labels.pr.includes.the.latest.target.branch.changes.d97098d',
          updated.number,
        ),
      );
      return true;
    } catch (cause) {
      this.showError(
        cause,
        translateLabel('loc.symphony.labels.unable.to.update.the.pull.request.branch.523f0d4'),
      );
      return false;
    } finally {
      this._pullRequestBranchUpdatingId.set(undefined);
    }
  }

  /**
   * Publishes the pull request.
   *
   * @param executionId - Execution id.
   * @public
   */
  public async publishPullRequest(executionId: string): Promise<boolean> {
    if (this._pullRequestBusy()) return false;
    this._pullRequestBusy.set(true);
    try {
      const execution = await this._client.request('pull-request.publish', { executionId });
      this._projection.update((snapshot) =>
        snapshot
          ? {
              ...snapshot,
              executions: snapshot.executions.map((candidate) =>
                candidate.id === execution.id ? execution : candidate,
              ),
            }
          : snapshot,
      );
      this._notifications.showSuccess(
        translateLabel('loc.symphony.labels.pull.request.created.b67b9db'),
        execution.pullRequest ? `PR #${execution.pullRequest.number} is ready on GitHub.` : '',
      );
      return true;
    } catch (cause) {
      this.showError(
        cause,
        translateLabel('loc.symphony.labels.unable.to.create.the.pull.request.8093f5b'),
      );
      return false;
    } finally {
      this._pullRequestBusy.set(false);
    }
  }

  private showError(cause: unknown, fallback: string): void {
    this._notifications.showError(fallback, operatorErrorMessage(cause));
  }

  // #endregion
}
