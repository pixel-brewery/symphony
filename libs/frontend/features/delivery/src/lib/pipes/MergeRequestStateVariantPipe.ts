// #region Imports

import { Pipe, type PipeTransform } from '@angular/core';
import type { Variant } from '@pixel-brewery/mosaik-elements-foundation';

// #endregion

@Pipe({ name: 'mergeRequestStateVariant', standalone: true, pure: true })
export class MergeRequestStateVariantPipe implements PipeTransform {
  // #region Methods

  /**
   * Transforms the input value for display.
   *
   * @param request - Request.
   * @public
   */
  public transform(request: { readonly draft: boolean; readonly state: string }): Variant {
    return request.draft ? 'neutral' : request.state === 'open' ? 'success' : 'primary';
  }

  // #endregion
}
