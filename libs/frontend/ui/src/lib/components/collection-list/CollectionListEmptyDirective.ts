// #region Imports

import { Directive } from '@angular/core';

// #endregion

/**
 * Marks the optional empty template of a `symphony-collection-list`, rendered in place of the
 * result `<ul>` while the item collection is empty. Without it the empty `<ul>` remains.
 */
@Directive({ selector: 'ng-template[symphonyCollectionListEmpty]' })
export class CollectionListEmptyDirective {}
