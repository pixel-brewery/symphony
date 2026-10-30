// #region Imports

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { ToolbarComponent } from '@pixel-brewery/mosaik-elements-angular';

// #endregion

/**
 * Action group shared by routed collection pages.
 *
 * Sits in the `suffix` slot of the route's `mosaik-page-header`, so the route reads as one line:
 * title on the left, actions on the right. `mosaik-page-header` has no `actions` slot - `suffix` is
 * the trailing one.
 *
 * @public
 */
@Component({
  selector: 'symphony-page-toolbar',
  host: {
    class: 'block min-w-0 max-w-full overflow-x-auto overscroll-contain',
    slot: 'suffix',
  },
  imports: [ToolbarComponent],
  templateUrl: './PageToolbarComponent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageToolbarComponent {
  // #region Properties

  /**
   * Accessible name for the toolbar action group.
   *
   * @public
   * @readonly
   */
  public readonly ariaLabel = input.required<string>();

  // #endregion
}
