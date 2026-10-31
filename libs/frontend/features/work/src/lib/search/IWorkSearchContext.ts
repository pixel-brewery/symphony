// #region Imports

import type { Signal } from '@angular/core';
import type { IWorkItem, ProjectFieldDefinition } from '@symphony/domain-work';

// #endregion

/**
 * The authoritative board fields actually consumed by Work's global search.
 *
 * @public
 */
export interface IWorkSearchContext {
  readonly snapshot: Signal<
    | {
        readonly workItems: readonly IWorkItem[];
        readonly projectFields?: readonly ProjectFieldDefinition[];
      }
    | undefined
  >;
}
