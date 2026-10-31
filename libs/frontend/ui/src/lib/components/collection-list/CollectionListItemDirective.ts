// #region Imports

import { Directive, input } from '@angular/core';
import type { ICollectionListItemContext } from './ICollectionListItemContext';

// #endregion

/**
 * Marks the row template of a `symphony-collection-list` and types its context from the bound
 * item collection. The template must render one `<li>` per item because the component owns the
 * surrounding scroll `<ul>`.
 */
@Directive({ selector: 'ng-template[symphonyCollectionListItem]' })
export class CollectionListItemDirective<T> {
  // #region Fields

  /**
   * The symphony collection list item.
   *
   * @public
   * @readonly
   */
  public readonly symphonyCollectionListItem = input.required<readonly T[]>();

  // #endregion

  // #region Methods

  /**
   * Angular lifecycle hook invoked template context guard.
   *
   * @param directive - Directive.
   * @param context - Context.
   * @typeParam T - The t type.
   * @public
   */
  public static ngTemplateContextGuard<T>(
    directive: CollectionListItemDirective<T>,
    context: unknown,
  ): context is ICollectionListItemContext<T> {
    return typeof context === 'object' && context !== null;
  }

  // #endregion
}
