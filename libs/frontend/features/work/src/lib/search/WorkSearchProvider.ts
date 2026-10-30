// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import { projectFieldSearchText } from '@symphony/domain-work';
import type { ISearchMatch, ISearchProvider } from '@symphony/frontend-search';
import type { IWorkSearchContext } from './IWorkSearchContext';
import { WORK_SEARCH_CONTEXT } from '../ports/WorkSearchContextToken';

// #endregion

/**
 * Searches the Work feature's authoritative board projection without copying its state.
 *
 * @public
 */
@Injectable()
export class WorkSearchProvider implements ISearchProvider {
  // #region Fields

  private readonly _context: IWorkSearchContext;

  // #endregion

  // #region Ctor

  /** Connects the existing read-only snapshot projection. @public */
  public constructor(
    @Inject(WORK_SEARCH_CONTEXT)
    context: IWorkSearchContext = inject(WORK_SEARCH_CONTEXT),
  ) {
    this._context = context;
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

  // #endregion
}
