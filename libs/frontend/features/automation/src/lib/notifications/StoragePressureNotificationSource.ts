// #region Imports

import { DOCUMENT } from '@angular/common';
import { computed, DestroyRef, effect, inject, Injectable, untracked } from '@angular/core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import {
  NotificationService,
  type INotificationItem,
  type INotificationSource,
} from '@symphony/frontend-notification';
import { storageSize } from '@symphony/frontend-ui';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

const MANAGED_ITEM_ID = 'storage:managed';
const FILESYSTEM_ITEM_ID = 'storage:filesystem';
const BLOCKED_ITEM_ID = 'storage:blocked';
const LOCAL_CI_ITEM_ID = 'storage:local-ci';
const WORKSPACE_ITEM_PREFIX = 'storage:workspace:';
const ENABLED_POLL_MILLISECONDS = 10_000;
const DISABLED_POLL_MILLISECONDS = 60_000;
const REVIEW_ACTIONS = [
  {
    id: 'review',
    get label() {
      return translateLabel('loc.symphony.labels.review.storage.48dfe55');
    },
    emphasis: 'secondary',
  },
] as const;

/**
 * Reports storage pressure from the single storage measurement: managed Symphony data near or at
 * its limit, a Mac low on free space, a workspace near its own limit, and blocked disk writes.
 * The fix opens the place where the limits and the storage picture live in Settings.
 *
 * @public
 */
@Injectable()
export class StoragePressureNotificationSource implements INotificationSource {
  // #region Fields

  private readonly _configuration = inject(ConfigurationStore);
  private readonly _desktop = inject(DESKTOP_CLIENT);
  private readonly _notifications = inject(NotificationService);
  private readonly _window = inject(DOCUMENT).defaultView;
  private readonly _localCiProblem = computed(() => this.localCiProblem());
  private _timer?: number;
  private _refreshInFlight?: Promise<void>;
  private _lastLocalCiBlockKey?: string;
  private _connected = false;
  private _disposed = false;

  /**
   * One item per storage area under pressure.
   *
   * @public
   * @readonly
   */
  public readonly items = computed<readonly INotificationItem[]>(() => {
    const status = this._configuration.storageStatus();
    const settings = this._configuration.settings();
    if (!status) return [];
    const items: INotificationItem[] = [];
    const managed = status.global;
    // The combined global pressure also includes the Mac reserve; quota copy must not use it.
    const managedRatio = managed.allocatedBytes / Math.max(1, managed.limitBytes);
    const managedPressure =
      managedRatio >= 0.95
        ? 'critical'
        : managedRatio >= 0.8
          ? 'danger'
          : managedRatio >= 0.6
            ? 'warning'
            : 'healthy';
    if (status.measured && managedPressure !== 'healthy') {
      items.push({
        id: MANAGED_ITEM_ID,
        severity: managedPressure === 'critical' ? 'error' : 'warning',
        get title() {
          return managedPressure === 'critical'
            ? translateLabel('loc.symphony.labels.managed.storage.is.full.9e5a1e3')
            : managedPressure === 'danger'
              ? translateLabel('loc.symphony.labels.managed.storage.is.almost.full.7b35aad')
              : translateLabel(
                  'loc.symphony.labels.managed.storage.is.approaching.its.limit.c4cd82c',
                );
        },
        location: ['System', 'Storage'],
        get detail() {
          return translateLabel(
            'loc.symphony.labels.of.in.use.5d3ce65',
            storageSize(managed.allocatedBytes),
            storageSize(managed.limitBytes),
          );
        },
        scope: { kind: 'mac' },
        actions: REVIEW_ACTIONS,
      });
    }
    const filesystem = status.filesystem;
    const filesystemKnown =
      status.localCiAdmission.state !== 'unknown' ||
      status.localCiAdmission.reason !== 'measurement-failed';
    if (filesystemKnown && filesystem.pressure !== 'healthy') {
      items.push({
        id: FILESYSTEM_ITEM_ID,
        severity: filesystem.pressure === 'critical' ? 'error' : 'warning',
        get title() {
          return filesystem.pressure === 'critical'
            ? translateLabel(
                'loc.symphony.labels.this.mac.has.reached.its.free.space.reserve.cb6c188',
              )
            : translateLabel('loc.symphony.labels.this.mac.is.low.on.free.space.0009111');
        },
        location: ['System', 'Storage'],
        get detail() {
          return translateLabel(
            'loc.symphony.labels.free.symphony.keeps.free.9552ce8',
            storageSize(filesystem.availableBytes),
            storageSize(filesystem.reserveBytes),
          );
        },
        scope: { kind: 'mac' },
        actions: REVIEW_ACTIONS,
      });
    }
    const localCiProblem = this._localCiProblem();
    if (localCiProblem) items.push(localCiProblem);
    if (
      status.measured &&
      !status.writable &&
      managedPressure !== 'critical' &&
      filesystem.pressure !== 'critical'
    ) {
      items.push({
        id: BLOCKED_ITEM_ID,
        severity: 'error',
        get title() {
          return translateLabel('loc.symphony.labels.new.disk.writing.work.is.blocked.36b2863');
        },
        location: ['System', 'Storage'],
        get detail() {
          return translateLabel(
            'loc.symphony.labels.new.ai.tasks.worktrees.and.local.github.actions.wait.1c6ed54',
          );
        },
        scope: { kind: 'mac' },
        actions: REVIEW_ACTIONS,
      });
    }
    const workspaces = new Map(
      settings?.workspaces
        .filter((workspace) => workspace.enabled)
        .map((workspace) => [workspace.id, workspace.displayName]) ?? [],
    );
    for (const usage of status.measured ? status.workspaces : []) {
      const name = usage.workspaceId ? workspaces.get(usage.workspaceId) : undefined;
      if (!usage.workspaceId || !name || usage.pressure === 'healthy') continue;
      items.push({
        id: `${WORKSPACE_ITEM_PREFIX}${usage.workspaceId}`,
        severity: usage.pressure === 'critical' ? 'error' : 'warning',
        get title() {
          return usage.pressure === 'critical'
            ? translateLabel('loc.symphony.labels.has.reached.its.storage.limit.b53f733', name)
            : translateLabel('loc.symphony.labels.is.approaching.its.storage.limit.158ef7a', name);
        },
        location: [name, 'Administration'],
        get detail() {
          return translateLabel(
            'loc.symphony.labels.of.in.use.5d3ce65',
            storageSize(usage.allocatedBytes),
            storageSize(usage.limitBytes),
          );
        },
        scope: { kind: 'workspace', workspaceId: usage.workspaceId, name },
        actions: REVIEW_ACTIONS,
      });
    }
    return items;
  });

  // #endregion

  // #region Ctor

  /**
   * Observes admission transitions and stops the source's checks with its window.
   *
   * @public
   */
  public constructor() {
    effect(() => this.notifyLocalCiBlock());
    inject(DestroyRef).onDestroy(() => {
      this._disposed = true;
      if (this._timer !== undefined) this._window?.clearTimeout(this._timer);
    });
  }

  // #endregion

  // #region Methods

  /**
   * Measures storage again without reporting a failure.
   *
   * @public
   */
  public refresh(): Promise<void> {
    if (this._disposed) return Promise.resolve();
    if (this._refreshInFlight) return this._refreshInFlight;
    this._refreshInFlight = this._configuration.refreshStorageStatus(true).finally(() => {
      this._refreshInFlight = undefined;
    });
    return this._refreshInFlight;
  }

  /**
   * Keeps storage admission visible without requiring the notification centre to be opened.
   *
   * @public
   */
  public connect(): void {
    if (this._connected || this._disposed) return;
    this._connected = true;
    this.notifyLocalCiBlock();
    void this.poll();
  }

  /**
   * Opens the storage picture: `System` for this Mac, `Administration` for a workspace.
   *
   * @param itemId - Identifier of a storage item.
   * @param actionId - `review`.
   * @public
   */
  public async perform(itemId: string, actionId: string): Promise<void> {
    if (actionId !== 'review') return;
    const localCiScope = itemId === LOCAL_CI_ITEM_ID ? this._localCiProblem()?.scope : undefined;
    const workspaceId = itemId.startsWith(WORKSPACE_ITEM_PREFIX)
      ? itemId.slice(WORKSPACE_ITEM_PREFIX.length)
      : localCiScope?.kind === 'workspace'
        ? localCiScope.workspaceId
        : undefined;
    await this._desktop.request('settings.open', {
      parameters: workspaceId
        ? { workspace: workspaceId, section: 'administration' }
        : { section: 'system' },
    });
  }

  private localCiEnabled(): boolean {
    return (
      this._configuration
        .settings()
        ?.workspaces.some((workspace) => workspace.enabled && workspace.localCiEnabled) ?? false
    );
  }

  private localCiProblem(): INotificationItem | undefined {
    const status = this._configuration.storageStatus();
    const admission = status?.localCiAdmission;
    if (!this.localCiEnabled() || !status || !admission || admission.state === 'permitted') {
      return undefined;
    }
    if (admission.state === 'unknown') {
      if (admission.reason !== 'measurement-failed') return undefined;
      return {
        id: LOCAL_CI_ITEM_ID,
        severity: 'error',
        get title() {
          return translateLabel(
            'loc.symphony.labels.local.github.actions.cannot.check.storage.13414ff',
          );
        },
        location: ['System', 'Storage'],
        get detail() {
          return translateLabel(
            'loc.symphony.labels.storage.could.not.be.measured.local.runs.wait.until..034fa89',
            storageSize(admission.reserveBytes),
          );
        },
        scope: { kind: 'mac' },
        actions: REVIEW_ACTIONS,
      };
    }
    const amounts = `Mac free: ${storageSize(admission.availableBytes)} · protected reserve: ${storageSize(admission.reserveBytes)} · required growth: ${storageSize(admission.requiredGrowthBytes)} · free-space shortfall: ${storageSize(admission.shortfallBytes)}`;
    let title: string;
    let detail = amounts;
    let scope: INotificationItem['scope'] = { kind: 'mac' };
    let location: readonly string[] = ['System', 'Storage'];
    switch (admission.reason) {
      case 'filesystem-reserve':
        title = 'Local GitHub Actions needs more free space';
        break;
      case 'managed-limit':
        title = 'Local GitHub Actions is blocked by the managed storage limit';
        break;
      case 'local-ci-limit':
        title = 'Local GitHub Actions is blocked by its storage limit';
        break;
      case 'workspace-limit': {
        title = 'Local GitHub Actions is blocked by a workspace storage limit';
        const workspace = this._configuration
          .settings()
          ?.workspaces.find((candidate) => candidate.id === admission.workspaceId);
        if (workspace) {
          detail = `${workspace.displayName} has reached its storage limit. ${amounts}`;
          scope = {
            kind: 'workspace',
            workspaceId: workspace.id,
            name: workspace.displayName,
          };
          location = [workspace.displayName, 'Administration'];
        }
        break;
      }
    }
    return {
      id: LOCAL_CI_ITEM_ID,
      severity: 'error',
      title,
      location,
      detail,
      scope,
      actions: REVIEW_ACTIONS,
    };
  }

  private notifyLocalCiBlock(): void {
    const status = this._configuration.storageStatus();
    const admission = status?.localCiAdmission;
    const enabled = this.localCiEnabled();
    const problem = this._localCiProblem();
    if (!this._connected || this._disposed) return;
    if (!enabled || admission?.state === 'permitted') {
      this._lastLocalCiBlockKey = undefined;
      return;
    }
    if (!admission || !problem) return;
    // Saved settings can arrive before their refreshed admission decision. Only confirmed
    // admission evidence may turn a continuing block into another notice.
    const key =
      admission.state === 'blocked'
        ? [admission.reason, admission.workspaceId ?? '', admission.reserveBytes].join(':')
        : admission.reason;
    if (key === this._lastLocalCiBlockKey) return;
    this._lastLocalCiBlockKey = key;
    untracked(() =>
      this._notifications.showError(
        problem.title,
        translateLabel(
          'loc.symphony.labels.review.storage.in.settings.835a8d9',
          problem.detail ?? '',
        ),
      ),
    );
  }

  private async poll(): Promise<void> {
    try {
      await this.refresh();
      this.notifyLocalCiBlock();
    } catch {
      // A transport failure retains the last confirmed status and does not fabricate a failed run.
    }
    if (this._disposed || !this._window) return;
    this._timer = this._window.setTimeout(
      () => void this.poll(),
      this.localCiEnabled() ? ENABLED_POLL_MILLISECONDS : DISABLED_POLL_MILLISECONDS,
    );
  }

  // #endregion
}
