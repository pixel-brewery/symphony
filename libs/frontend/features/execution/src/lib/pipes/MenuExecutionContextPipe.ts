// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IExecutionRecord } from '@symphony/domain-execution';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

@Pipe({ name: 'menuExecutionContext', standalone: true, pure: true })
export class MenuExecutionContextPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param execution - Execution.
   * @param workspaces - Workspaces.
   * @param now - Now.
   * @public
   */
  public transform(
    execution: IExecutionRecord,
    workspaces: ApplicationSettingsDto['workspaces'],
    now: number,
  ): string {
    if (execution.pause?.resumeRequestedAt) return 'Queued for the next available execution slot';
    const workspace = workspaces.find((candidate) => candidate.id === execution.workspaceId);
    const kind =
      execution.kind === 'solution'
        ? 'Implementation'
        : execution.kind === 'revision'
          ? 'Revision'
          : 'Analysis';
    const elapsedSeconds = Math.max(
      0,
      Math.floor((now - new Date(execution.startedAt).getTime()) / 1_000),
    );
    const minutes = Math.floor(elapsedSeconds / 60);
    const seconds = elapsedSeconds % 60;
    return `${workspace?.displayName ?? 'Workspace'} · ${kind} · ${minutes}:${seconds.toString().padStart(2, '0')}`;
  }

  // #endregion
}
