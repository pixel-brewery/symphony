// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { IActionRunRow } from '../actions/view-presenters/actionsOverview/IActionRunRow';
import { RunEventLabelPipe } from './RunEventLabelPipe';
import { ShortRevisionPipe } from './ShortRevisionPipe';

// #endregion

/**
 * Writes the technical line that identifies what a run checked: branch, short revision and
 * trigger, for example `dev · 4f2a91c · push`.
 *
 * @public
 */
@Pipe({ name: 'actionRunRevision', standalone: true, pure: true })
export class ActionRunRevisionPipe implements PipeTransform {
  // #region Fields

  private readonly _revision = new ShortRevisionPipe();
  private readonly _event = new RunEventLabelPipe();

  // #endregion

  // #region Methods

  /**
   * Composes the line.
   *
   * @param row - Run row.
   * @returns The line, or `—` when the run reports none of the parts.
   * @public
   */
  public transform(row: Pick<IActionRunRow, 'branch' | 'revision' | 'event'>): string {
    const parts = [
      row.branch,
      this._revision.transform(row.revision),
      this._event.transform(row.event),
    ].filter((part): part is string => Boolean(part));
    return parts.length ? parts.join(' · ') : '—';
  }

  // #endregion
}
