// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  TranslateDirective,
  SegmentComponent,
  SegmentItemComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { AppearanceSettingsViewPresenter } from './AppearanceSettingsViewPresenter';
import { translateLabel } from '@symphony/frontend-intl/labels';

// #endregion

/**
 * The `Light | Dark | System` theme segment, in Appearance and in search results.
 *
 * @public
 */
@Component({
  selector: 'symphony-theme-segment',
  host: { class: 'flex flex-none items-center' },
  imports: [TranslateDirective, SegmentComponent, SegmentItemComponent],
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
    {
      value: 'light',
      get label() {
        return translateLabel('loc.symphony.labels.light.dbcd5e7');
      },
    },
    {
      value: 'dark',
      get label() {
        return translateLabel('loc.symphony.labels.dark.60acc53');
      },
    },
    { value: 'system', label: 'System' },
  ] as const;

  // #endregion
}
