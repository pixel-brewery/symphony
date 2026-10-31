// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import type { INotificationItem, INotificationSource } from '@symphony/frontend-notification';
import { storageSize } from '@symphony/frontend-ui';

// #endregion

const MANAGED_ITEM_ID = 'storage:managed';
const FILESYSTEM_ITEM_ID = 'storage:filesystem';
const BLOCKED_ITEM_ID = 'storage:blocked';
const WORKSPACE_ITEM_PREFIX = 'storage:workspace:';

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

  /**
   * One item per storage area under pressure.
   *
   * @public
   * @readonly
   */
  public readonly items = computed<readonly INotificationItem[]>(() => {
    const status = this._configuration.storageStatus();
    const settings = this._configuration.settings();
    if (!status?.measured) return [];
    const review = [{ id: 'review', label: 'Review storage', emphasis: 'secondary' }] as const;
    const items: INotificationItem[] = [];
    const managed = status.global;
    if (managed.pressure !== 'healthy') {
      items.push({
        id: MANAGED_ITEM_ID,
        severity: managed.pressure === 'critical' ? 'error' : 'warning',
        title:
          managed.pressure === 'critical'
            ? 'Managed storage is full'
            : managed.pressure === 'danger'
              ? 'Managed storage is almost full'
              : 'Managed storage is approaching its limit',
        location: ['System', 'Storage'],
        detail: `${storageSize(managed.allocatedBytes)} of ${storageSize(managed.limitBytes)} in use`,
        scope: { kind: 'mac' },
        actions: review,
      });
    }
    const filesystem = status.filesystem;
    if (filesystem.pressure !== 'healthy') {
      items.push({
        id: FILESYSTEM_ITEM_ID,
        severity: filesystem.pressure === 'critical' ? 'error' : 'warning',
        title:
          filesystem.pressure === 'critical'
            ? 'This Mac is out of free space'
            : 'This Mac is low on free space',
        location: ['System', 'Storage'],
        detail: `${storageSize(filesystem.availableBytes)} free · Symphony keeps ${storageSize(filesystem.reserveBytes)} free`,
        scope: { kind: 'mac' },
        actions: review,
      });
    }
    if (!status.writable && managed.pressure !== 'critical' && filesystem.pressure !== 'critical') {
      items.push({
        id: BLOCKED_ITEM_ID,
        severity: 'error',
        title: 'New disk-writing work is blocked',
        location: ['System', 'Storage'],
        detail: 'new AI tasks, worktrees and Local GitHub Actions wait until data is cleared',
        scope: { kind: 'mac' },
        actions: review,
      });
    }
    const workspaces = new Map(
      settings?.workspaces
        .filter((workspace) => workspace.enabled)
        .map((workspace) => [workspace.id, workspace.displayName]) ?? [],
    );
    for (const usage of status.workspaces) {
      const name = usage.workspaceId ? workspaces.get(usage.workspaceId) : undefined;
      if (!usage.workspaceId || !name || usage.pressure === 'healthy') continue;
      items.push({
        id: `${WORKSPACE_ITEM_PREFIX}${usage.workspaceId}`,
        severity: usage.pressure === 'critical' ? 'error' : 'warning',
        title:
          usage.pressure === 'critical'
            ? `${name} has reached its storage limit`
            : `${name} is approaching its storage limit`,
        location: [name, 'Administration'],
        detail: `${storageSize(usage.allocatedBytes)} of ${storageSize(usage.limitBytes)} in use`,
        scope: { kind: 'workspace', workspaceId: usage.workspaceId, name },
        actions: review,
      });
    }
    return items;
  });

  // #endregion

  // #region Methods

  /**
   * Measures storage again without reporting a failure.
   *
   * @public
   */
  public refresh(): Promise<void> {
    return this._configuration.refreshStorageStatus(true);
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
    const workspaceId = itemId.startsWith(WORKSPACE_ITEM_PREFIX)
      ? itemId.slice(WORKSPACE_ITEM_PREFIX.length)
      : undefined;
    await this._desktop.request('settings.open', {
      parameters: workspaceId
        ? { workspace: workspaceId, section: 'administration' }
        : { section: 'system' },
    });
  }

  // #endregion
}
