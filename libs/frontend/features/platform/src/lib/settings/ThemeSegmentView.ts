// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { SegmentComponent, SegmentItemComponent } from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { AppearanceSettingsViewPresenter } from './AppearanceSettingsViewPresenter';

// #endregion

/**
 * The `Light | Dark | System` theme segment, in Appearance and in search results.
 *
 * @public
 */
@Component({
  selector: 'symphony-theme-segment',
  host: { class: 'flex flex-none items-center' },
  imports: [SegmentComponent, SegmentItemComponent],
  providers: [{ provide: VIEW_PRESENTER, useClass: AppearanceSettingsViewPresenter }],
  templateUrl: './ThemeSegmentView.html',
  styleUrl: './ThemeSegmentView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ThemeSegmentView extends View<AppearanceSettingsViewPresenter> {
  // #region Fields

  /**
   * The themes in segment order.
   *
   * @protected
   * @readonly
   */
  protected readonly themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'system', label: 'System' },
  ] as const;

  // #endregion
}
