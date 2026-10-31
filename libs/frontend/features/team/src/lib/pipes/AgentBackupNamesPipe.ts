// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IWorkspaceAgentFallbackView } from '../settings/workspace-organization/IWorkspaceAgentFallbackView';

// #endregion

/**
 * Lists an agent's backup accounts in the order they take over.
 *
 * @public
 */
@Pipe({ name: 'agentBackupNames', standalone: true, pure: true })
export class AgentBackupNamesPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the backups into one comma-separated list of account names.
   *
   * @param fallbacks - Backup routes in priority order.
   * @public
   */
  public transform(fallbacks: readonly IWorkspaceAgentFallbackView[]): string {
    return fallbacks.map((fallback) => fallback.accountDisplayName).join(', ');
  }

  // #endregion
}
