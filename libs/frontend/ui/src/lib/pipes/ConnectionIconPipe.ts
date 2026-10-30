// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

type ConnectionKind = ApplicationSettingsDto['connections'][number]['kind'];

@Pipe({ name: 'connectionIcon', standalone: true, pure: true })
export class ConnectionIconPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param kind - Kind.
   * @public
   */
  public transform(
    kind: ConnectionKind,
  ): 'azureDevOps' | 'github' | 'openai' | 'claude' | 'sparkle' {
    switch (kind) {
      case 'azure-devops':
        return 'azureDevOps';
      case 'github':
        return 'github';
      case 'codex':
        return 'openai';
      case 'claude':
        return 'claude';
      default:
        return 'sparkle';
    }
  }

  // #endregion
}
