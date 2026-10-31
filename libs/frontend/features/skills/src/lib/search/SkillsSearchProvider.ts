// #region Imports

import { Inject, inject, Injectable } from '@angular/core';
import type { ISearchMatch, ISearchProvider } from '@symphony/frontend-search';
import { SkillStore } from '../catalog/SkillStore';

// #endregion

/**
 * Searches the single Skills catalog owner and contributes its existing Settings alias.
 *
 * @public
 */
@Injectable()
export class SkillsSearchProvider implements ISearchProvider {
  // #region Fields

  private readonly _catalog: Pick<SkillStore, 'skillCatalog'>;

  // #endregion

  // #region Ctor

  /** Connects the feature's existing catalog owner. @public */
  public constructor(
    @Inject(SkillStore) catalog: Pick<SkillStore, 'skillCatalog'> = inject(SkillStore),
  ) {
    this._catalog = catalog;
  }

  // #endregion

  // #region Properties

  /** Stable Skills search provider identity. @public @readonly */
  public readonly id = 'skills.search';
  /** Skills follow matching Work, Delivery and CI data. @public @readonly */
  public readonly order = 40;
  /** The route phrase retains its existing bare Settings destination. @public @readonly */
  public readonly aliases = [{ term: 'skills', path: '/main/settings', order: 6 }];

  // #endregion

  // #region Methods

  /**
   * Matches existing package metadata and opens the Skills section.
   *
   * @param _query - Original trimmed input; the existing Skills destination has no query filter.
   * @param normalizedQuery - Locale-normalized package metadata search input.
   * @returns The existing Skills Settings destination when a package matches.
   * @public
   */
  public match(_query: string, normalizedQuery: string): ISearchMatch | undefined {
    const skillMatch = this._catalog
      .skillCatalog()
      ?.packages.some((skill) =>
        [skill.name, skill.displayName, skill.description, skill.source]
          .join(' ')
          .toLocaleLowerCase()
          .includes(normalizedQuery),
      );
    return skillMatch ? { path: '/main/settings', queryParams: { section: 'skills' } } : undefined;
  }

  // #endregion
}
