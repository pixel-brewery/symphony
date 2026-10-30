// #region Imports

import { Inject, inject, Injectable, type Signal } from '@angular/core';
import { computed } from '@angular/core';
import type { IWorkItem } from '@symphony/domain-work';
import {
  resolveBoardColumnLayout,
  workItemIdsInProgress,
  workItemIdsNeedingAttention,
} from '@symphony/frontend-core';
import { liveTile, type IWidgetTile } from '@symphony/frontend-widget';
import type { IWorkWidgetContext } from './IWorkWidgetContext';
import { WORK_WIDGET_CONTEXT } from '../ports/WorkWidgetContextToken';

// #endregion

const BOARD_ROUTE = '/main/board';

/** Owns the Board category's unchanged projections and counts. @public */
@Injectable({ providedIn: 'root' })
export class WorkWidgetSource {
  // #region Fields
  private readonly _store: IWorkWidgetContext;
  private readonly _workItems: Signal<readonly IWorkItem[]>;
  private readonly _boardTiles = computed<readonly IWidgetTile[]>(() => {
    const snapshot = this._store.snapshot();
    if (!snapshot) return [];
    const items = this._workItems();
    const layout = resolveBoardColumnLayout(
      snapshot.boardColumns,
      this._store.activeBoard()?.id,
      items,
    );
    const inProgress = workItemIdsInProgress(items, snapshot.executions);
    const counts = new Map<string, number>();
    const running = new Map<string, number>();
    for (const item of items) {
      const columnId = layout.columnIdFor(item);
      counts.set(columnId, (counts.get(columnId) ?? 0) + 1);
      if (inProgress.has(item.id)) running.set(columnId, (running.get(columnId) ?? 0) + 1);
    }

    const attention = this.attentionCount();
    const tiles: IWidgetTile[] = attention
      ? [
          {
            id: 'attention',
            testId: 'home-attention-widget',
            label: 'Needs attention',
            count: attention,
            route: BOARD_ROUTE,
            queryParams: { attention: 'true' },
            ariaLabel: `Open the board filtered to the ${attention} work items needing attention`,
            live: false,
            attention: true,
          },
        ]
      : [];
    for (const column of layout.columns) {
      tiles.push(
        liveTile({
          id: column.id,
          testId: `home-column-widget-${column.id}`,
          label: column.label,
          count: counts.get(column.id) ?? 0,
          route: BOARD_ROUTE,
          queryParams: { column: column.id },
          ariaLabel: `Open the board filtered to ${column.label}`,
          liveCount: running.get(column.id) ?? 0,
        }),
      );
    }
    return tiles;
  });
  // #endregion
  // #region Ctor
  /** Connects only the existing Work projection fields consumed here. @public */
  public constructor(
    @Inject(WORK_WIDGET_CONTEXT) context: IWorkWidgetContext = inject(WORK_WIDGET_CONTEXT),
  ) {
    this._store = context;
    this._workItems = context.scopedWorkItems;
  }
  // #endregion
  // #region Properties
  /** The exact Board attention-filter count. @public @readonly */
  public readonly attentionCount = computed(() => {
    const snapshot = this._store.snapshot();
    return workItemIdsNeedingAttention(this._workItems(), snapshot?.executions ?? [], {
      stages: snapshot?.workflow.stages ?? [],
      fields: snapshot?.projectFields ?? [],
      readiness: snapshot?.workItemReadiness ?? [],
    }).size;
  });
  /** Current Board tiles from their authoritative source. @public @readonly */
  public get tiles(): Signal<readonly IWidgetTile[]> {
    return this._boardTiles;
  }
  // #endregion
}
