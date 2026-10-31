// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  ButtonComponent,
  IconComponent,
  IconNameDirective,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { SettingsConditionalComponent } from '../components/SettingsConditionalComponent';
import { SettingsRowComponent } from '../components/SettingsRowComponent';
import { SettingsSearchControlComponent } from '../components/SettingsSearchControlComponent';
import { SettingsSearchHighlightPipe } from '../pipes/SettingsSearchHighlightPipe';
import { SettingsViewPresenter } from '../view-presenters/SettingsViewPresenter';

// #endregion

/**
 * `Search settings`: the settings matching the sidebar search, grouped by breadcrumb with the
 * match highlighted; a result changes its setting in place or opens its section.
 *
 * @public
 */
@Component({
  selector: 'symphony-settings-search-view',
  host: { class: 'flex min-w-0 flex-col gap-3' },
  imports: [
    ButtonComponent,
    IconComponent,
    IconNameDirective,
    SettingsConditionalComponent,
    SettingsRowComponent,
    SettingsSearchControlComponent,
    SettingsSearchHighlightPipe,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
  ],
  templateUrl: './SettingsSearchView.html',
  styleUrl: './SettingsSearchView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSearchView {
  // #region Fields

  /**
   * The Settings window's selection and search.
   *
   * @protected
   * @readonly
   */
  protected readonly presenter = inject(SettingsViewPresenter);

  // #endregion
}
