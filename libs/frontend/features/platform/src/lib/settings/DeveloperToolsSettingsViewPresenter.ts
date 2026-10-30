// #region Imports

import { computed, inject, Injectable } from '@angular/core';
import { MessageBoxService } from '@pixel-brewery/mosaik-elements-angular';
import { Command, Hydratable, ViewPresenter } from '@symphony/frontend-core';
import type { RuntimeHealthDto } from '@symphony/ipc-contracts-platform';
import type { IRuntimeDependencyView } from '../models/IRuntimeDependencyView';
import type { RuntimeDependencyCommand } from '../models/RuntimeDependencyCommand';
import { PlatformStore } from '../state/PlatformStore';

// #endregion

/**
 * Presents native tool readiness and explicit Homebrew installation decisions.
 *
 * @public
 */
@Injectable()
export class DeveloperToolsSettingsViewPresenter extends Hydratable(ViewPresenter) {
  // #region Fields

  private readonly _messageBoxService = inject(MessageBoxService);
  /**
   * Sole native inspection and installer activity owner.
   *
   * @public
   * @readonly
   */
  public readonly store = inject(PlatformStore);
  /**
   * The runtime dependencies.
   *
   * @public
   * @readonly
   */
  public readonly runtimeDependencies = computed<readonly IRuntimeDependencyView[]>(() => {
    const health = this.store.runtimeHealth();
    if (!health) return [];
    return [
      this.runtimeDependency('homebrew', health.homebrew),
      this.runtimeDependency('git', health.git, 'git'),
      this.runtimeDependency('github-cli', health.githubCli, 'gh'),
      this.runtimeDependency('codex', health.agents.codex, 'codex'),
      this.runtimeDependency('claude', health.agents.claude, 'claude'),
      this.runtimeDependency('opencode', health.agents.opencode, 'opencode'),
    ];
  });

  private readonly _refreshRuntimeHealthCommand: Command<void> = new Command(
    () => void this.onExecuteRefreshRuntimeHealthCommand(),
  );

  private readonly _confirmInstallRuntimeDependencyCommand: Command<
    readonly [item: IRuntimeDependencyView, label: string]
  > = new Command(
    (parameters) => void this.onExecuteConfirmInstallRuntimeDependencyCommand(...parameters),
  );

  // #endregion

  // #region Properties

  /**
   * The refreshRuntimeHealth command.
   *
   * @public
   * @readonly
   */
  public get refreshRuntimeHealthCommand(): Command<void> {
    return this._refreshRuntimeHealthCommand;
  }

  /**
   * The confirmInstallRuntimeDependency command.
   *
   * @public
   * @readonly
   */
  public get confirmInstallRuntimeDependencyCommand(): Command<
    readonly [item: IRuntimeDependencyView, label: string]
  > {
    return this._confirmInstallRuntimeDependencyCommand;
  }

  // #endregion

  // #region Methods

  /**
   * Inspects tools on demand when the initial snapshot has no confirmed health.
   *
   * @public
   */
  public override onHydrate(): Promise<void> | undefined {
    return this.store.runtimeHealth() ? undefined : this.store.refreshRuntimeHealth();
  }

  /**
   * Refreshes the runtime health.
   *
   * @private
   */
  private onExecuteRefreshRuntimeHealthCommand(): void {
    void this.store.refreshRuntimeHealth();
  }

  /**
   * Confirms the install runtime dependency.
   *
   * @param item - Item.
   * @param label - Label.
   * @private
   */
  private onExecuteConfirmInstallRuntimeDependencyCommand(
    item: IRuntimeDependencyView,
    label: string,
  ): void {
    const command = item.installCommand;
    if (!command || item.health.available || !this.store.runtimeHealth()?.homebrew.available) {
      return;
    }
    const confirmation = this._messageBoxService.show({
      id: `install-runtime-dependency-${item.id}`,
      header: `Install ${label}?`,
      message: `Homebrew will download and install ${label} on this Mac. Symphony uses a fixed package recipe and verifies the command after installation.`,
      buttons: 'yesNo',
      variant: 'warning',
      pressEscapeToClose: true,
      intl: { yesLabel: 'Install with Homebrew', noLabel: 'Cancel' },
    });
    confirmation.closed.subscribe((decision) => {
      if (decision.reason === 'positive') {
        void this.store.installRuntimeDependency(command);
      }
    });
  }

  private runtimeDependency(
    id: IRuntimeDependencyView['id'],
    health: RuntimeHealthDto['git'],
    installCommand?: RuntimeDependencyCommand,
  ): IRuntimeDependencyView {
    return {
      id,
      health,
      ...(installCommand ? { installCommand } : {}),
    };
  }

  // #endregion
}
