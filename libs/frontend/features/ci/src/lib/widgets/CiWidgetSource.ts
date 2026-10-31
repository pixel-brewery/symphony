// #region Imports

import { computed, Inject, inject, Injectable, type Signal } from '@angular/core';
import type { ICiRun } from '@symphony/domain-ci';
import { RUN_STATUSES, actionStatusLabel } from '@symphony/frontend-core/delivery';
import type { IWidgetTile } from '@symphony/frontend-widget';
import type { ICiContext } from '../ports/ICiContext';
import { CI_CONTEXT } from '../ports/CiContextToken';

// #endregion

const ACTIONS_ROUTE = '/main/actions';

/** Owns the unchanged Actions status category from CI's current run projection. @public */
@Injectable({ providedIn: 'root' })
export class CiWidgetSource {
  // #region Fields
  private readonly _context: Pick<ICiContext, 'runs'>;
  private readonly _actionTiles = computed<readonly IWidgetTile[]>(() => {
    const runs = this._context.runs();
    if (!runs.length) return [];
    const counts = new Map<ICiRun['status'], number>();
    for (const run of runs) counts.set(run.status, (counts.get(run.status) ?? 0) + 1);
    return RUN_STATUSES.map((status) => {
      const label = actionStatusLabel(status);
      const count = counts.get(status) ?? 0;
      return {
        id: status,
        testId: `home-action-widget-${status}`,
        label,
        count,
        route: ACTIONS_ROUTE,
        queryParams: { status },
        ariaLabel: `Open the workflow runs filtered to ${label}`,
        live: status === 'in-progress' && count > 0,
        attention: false,
      } satisfies IWidgetTile;
    });
  });
  // #endregion
  // #region Ctor
  /** Connects CI's existing feature-owned read-only run context. @public */
  public constructor(@Inject(CI_CONTEXT) context: Pick<ICiContext, 'runs'> = inject(CI_CONTEXT)) {
    this._context = context;
  }
  // #endregion
  // #region Properties
  /** Current workflow-run status tiles. @public @readonly */
  public get tiles(): Signal<readonly IWidgetTile[]> {
    return this._actionTiles;
  }
  // #endregion
}
