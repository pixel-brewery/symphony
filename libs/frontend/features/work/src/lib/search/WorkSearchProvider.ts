// #region Imports

import { Inject, inject, Injectable, Optional } from '@angular/core';
import { projectFieldSearchText } from '@symphony/domain-work';
import type { IPaletteResult, ISearchMatch, ISearchProvider } from '@symphony/frontend-search';
import type { IWorkSearchContext } from './IWorkSearchContext';
import { projectWorkPaletteResults } from './projectWorkPaletteResults';
import { WORK_SEARCH_CONTEXT } from '../ports/WorkSearchContextToken';
import { WORK_WIDGET_CONTEXT } from '../ports/WorkWidgetContextToken';
import type { IWorkWidgetContext } from '../widgets/IWorkWidgetContext';

// #endregion

/**
 * Searches the Work feature's authoritative board projection without copying its state, for the
 * contextual and global search and for the command palette.
 *
 * @public
 */
@Injectable()
export class WorkSearchProvider implements ISearchProvider {
  // #region Fields

  private readonly _context: IWorkSearchContext;
  private readonly _board: IWorkWidgetContext | null;

  // #endregion

  // #region Ctor

  /**
   * Connects the existing read-only snapshot projection and, for the command palette, the scoped
   * board projection the Board itself shows.
   *
   * @public
   */
  public constructor(
    @Inject(WORK_SEARCH_CONTEXT)
    context: IWorkSearchContext = inject(WORK_SEARCH_CONTEXT),
    @Inject(WORK_WIDGET_CONTEXT) @Optional() board: IWorkWidgetContext | null = null,
  ) {
    this._context = context;
    this._board = board;
  }

  // #endregion

  // #region Properties

  /** Stable Work search provider identity. @public @readonly */
  public readonly id = 'work.search';
  /** Work data retains first priority after aliases. @public @readonly */
  public readonly order = 10;
  /** Board searches preserve the current page and query parameters. @public @readonly */
  public readonly contextualPaths = ['/main/board'];
  /** Existing global Board route phrase. @public @readonly */
  public readonly aliases = [{ term: 'board', path: '/main/board', order: 3 }];

  // #endregion

  // #region Methods

  /**
   * Matches the fields already included by the global board search.
   *
   * @param query - Trimmed input retained for the target route's query.
   * @param normalizedQuery - Locale-normalized input used by existing field matching.
   * @returns The board destination when a work item matches.
   * @public
   */
  public match(query: string, normalizedQuery: string): ISearchMatch | undefined {
    const snapshot = this._context.snapshot();
    const ticketMatch = snapshot?.workItems.some((item) =>
      [
        item.externalId,
        item.title,
        item.body,
        item.repository,
        projectFieldSearchText(snapshot.projectFields ?? [], item.projectFields),
        ...item.labels,
        ...item.assignees.flatMap((assignee) => [assignee.login, assignee.displayName ?? '']),
      ]
        .join(' ')
        .toLocaleLowerCase()
        .includes(normalizedQuery),
    );
    return ticketMatch ? { path: '/main/board', queryParams: { q: query } } : undefined;
  }

  /**
   * Lists the matching work items of the active workspace scope, each opening on the board, and
   * `New work item…` (⌘N).
   *
   * @param _query - Trimmed palette input; matching uses the normalized form.
   * @param normalizedQuery - Locale-lowercased palette input; empty lists only the command.
   * @returns Work's palette rows.
   * @public
   */
  public paletteResults(_query: string, normalizedQuery: string): readonly IPaletteResult[] {
    const board = this._board;
    const snapshot = board?.snapshot();
    const items = board ? board.scopedWorkItems() : (this._context.snapshot()?.workItems ?? []);
    const activeBoardId = board?.activeBoard()?.id;
    return projectWorkPaletteResults(
      items,
      snapshot
        ? {
            boardColumns: snapshot.boardColumns,
            ...(activeBoardId ? { activeBoardId } : {}),
            executions: snapshot.executions,
            stages: snapshot.workflow.stages,
            ...(snapshot.projectFields ? { projectFields: snapshot.projectFields } : {}),
            ...(snapshot.workItemReadiness ? { readiness: snapshot.workItemReadiness } : {}),
          }
        : undefined,
      normalizedQuery,
    );
  }

  // #endregion
}
