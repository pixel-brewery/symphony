// #region Imports

import { computed, inject, Injectable, signal } from '@angular/core';
import { MessageBoxService } from '@pixel-brewery/mosaik-elements-angular';
import { ConfigurationStore } from '@symphony/frontend-core/configuration';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import type { INotificationItem, INotificationSource } from '@symphony/frontend-notification';
import type { RuntimeHealthDto } from '@symphony/ipc-contracts-platform';
import type { RuntimeDependencyCommand } from '../models/RuntimeDependencyCommand';
import { PLATFORM_CLIENT } from '../ports/PlatformClientToken';
import { PLATFORM_HEALTH_PROJECTION } from '../ports/PlatformHealthProjectionToken';
import { PlatformStore } from '../state/PlatformStore';

// #endregion

const ITEM_PREFIX = 'developer-tools:';

const TOOL_LABELS: Readonly<Record<RuntimeDependencyCommand, string>> = {
  git: 'Git',
  gh: 'GitHub CLI',
  codex: 'Codex CLI',
  claude: 'Claude Code CLI',
  opencode: 'OpenCode CLI',
};

const LIST_FORMAT = new Intl.ListFormat('en', { style: 'long', type: 'conjunction' });

/**
 * Reports developer CLIs Symphony needs but cannot find on this Mac: Git always, the GitHub CLI
 * for GitHub connections, and each AI runtime that a connected AI account runs on. The fix
 * installs the tool with Homebrew after the same confirmation as `System › Developer tools`, or
 * opens that place when Homebrew is missing.
 *
 * @public
 */
@Injectable()
export class DeveloperToolsNotificationSource implements INotificationSource {
  // #region Fields

  private readonly _store = inject(PlatformStore);
  private readonly _client = inject(PLATFORM_CLIENT);
  private readonly _projection = inject(PLATFORM_HEALTH_PROJECTION);
  private readonly _configuration = inject(ConfigurationStore);
  private readonly _desktop = inject(DESKTOP_CLIENT);
  private readonly _messageBoxService = inject(MessageBoxService);

  /** Health read by `refresh` in a window without an application snapshot, such as the tray. */
  private readonly _inspectedHealth = signal<RuntimeHealthDto | undefined>(undefined);

  private readonly _health = computed(
    () => this._projection.runtimeHealth() ?? this._inspectedHealth(),
  );

  /**
   * One item per required CLI that is not installed.
   *
   * @public
   * @readonly
   */
  public readonly items = computed<readonly INotificationItem[]>(() => {
    const health = this._health();
    const settings = this._configuration.settings();
    if (!health || !settings) return [];
    const workspaceIds = new Set(
      settings.workspaces.filter((workspace) => workspace.enabled).map((workspace) => workspace.id),
    );
    const connections = settings.connections.filter((connection) =>
      workspaceIds.has(connection.workspaceId),
    );
    const accountNames = (kind: 'codex' | 'claude' | 'opencode'): string[] => [
      ...new Set(
        connections
          .filter((connection) => connection.kind === kind)
          .map((connection) => connection.displayName.replace(/ account$/iu, '')),
      ),
    ];
    const required: { command: RuntimeDependencyCommand; available: boolean; detail: string }[] = [
      {
        command: 'git',
        available: health.git.available,
        detail: 'Symphony cannot prepare repositories until it is',
      },
    ];
    if (connections.some((connection) => connection.kind === 'github')) {
      required.push({
        command: 'gh',
        available: health.githubCli.available,
        detail: 'GitHub sign-in, pull requests and Actions need it',
      });
    }
    for (const kind of ['codex', 'claude', 'opencode'] as const) {
      const names = accountNames(kind);
      if (!names.length) continue;
      required.push({
        command: kind,
        available: health.agents[kind].available,
        detail: `the ${LIST_FORMAT.format(names)} account${names.length === 1 ? '' : 's'} cannot run until it is`,
      });
    }
    const installing = this._store.runtimeDependencyInstallBusy();
    const homebrew = health.homebrew.available;
    return required
      .filter((tool) => !tool.available)
      .map((tool): INotificationItem => ({
        id: `${ITEM_PREFIX}${tool.command}`,
        severity: 'error',
        title: `${TOOL_LABELS[tool.command]} is not installed`,
        location: ['System', 'Developer tools'],
        detail: tool.detail,
        scope: { kind: 'mac' },
        actions: homebrew
          ? [
              {
                id: 'install',
                label: 'Install with Homebrew',
                emphasis: 'primary',
                busy: installing === tool.command,
                disabled: installing !== undefined,
              },
            ]
          : [{ id: 'open', label: 'Open Developer tools', emphasis: 'secondary' }],
      }));
  });

  // #endregion

  // #region Methods

  /**
   * Inspects the developer tools again without reporting a failure.
   *
   * @public
   */
  public async refresh(): Promise<void> {
    try {
      const health = await this._client.request('health.get', {});
      this._projection.updateRuntimeHealth(health);
      this._inspectedHealth.set(health);
    } catch {
      // The last confirmed health stays; the Settings card reports inspection failures.
    }
  }

  /**
   * Installs the tool after confirmation, or opens `System › Developer tools`.
   *
   * @param itemId - Identifier of a missing-tool item.
   * @param actionId - `install` or `open`.
   * @public
   */
  public async perform(itemId: string, actionId: string): Promise<void> {
    if (actionId === 'open') {
      await this._desktop.request('settings.open', { parameters: { section: 'system' } });
      return;
    }
    const command = itemId.slice(ITEM_PREFIX.length) as RuntimeDependencyCommand;
    if (actionId !== 'install' || !(command in TOOL_LABELS)) return;
    if (this._store.runtimeDependencyInstallBusy() || !this._health()?.homebrew.available) return;
    const label = TOOL_LABELS[command];
    const confirmation = this._messageBoxService.show({
      id: `install-runtime-dependency-${command}`,
      header: `Install ${label}?`,
      message: `Homebrew will download and install ${label} on this Mac. Symphony uses a fixed package recipe and verifies the command after installation.`,
      buttons: 'yesNo',
      variant: 'warning',
      pressEscapeToClose: true,
      intl: { yesLabel: 'Install with Homebrew', noLabel: 'Cancel' },
    });
    confirmation.closed.subscribe((decision) => {
      if (decision.reason === 'positive') void this._store.installRuntimeDependency(command);
    });
  }

  // #endregion
}
