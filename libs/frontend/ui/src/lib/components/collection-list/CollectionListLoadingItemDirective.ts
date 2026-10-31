// #region Imports

import { Directive } from '@angular/core';

// #endregion

/**
 * Marks the skeleton row template of a `symphony-collection-list`. While the list loads, the
 * component repeats it inside its own scroll `<ul>`, so a skeleton row sits in exactly the
 * container, padding and grid of the rows that replace it. The template must render one `<li>`.
 */
@Directive({ selector: 'ng-template[symphonyCollectionListLoadingItem]' })
export class CollectionListLoadingItemDirective {}
