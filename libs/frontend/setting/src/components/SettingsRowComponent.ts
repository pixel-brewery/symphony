// #region Imports

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TextComponent, TypographyDirective } from '@pixel-brewery/mosaik-elements-angular';
import type { ISettingsSearchTextPart } from '../search/ISettingsSearchTextPart';

// #endregion

/**
 * One setting inside a `symphony-settings-group`: its label and description on the left and its
 * control on the right. Content with `slot="leading"` (an avatar, icon or status dot) renders
 * before the label, content with `slot="detail"` below the description.
 *
 * @public
 */
@Component({
  selector: 'symphony-settings-row',
  host: {
    class: 'flex min-w-0 items-center gap-2 px-2 py-1.5',
    part: 'settings-row',
  },
  imports: [TextComponent, TypographyDirective],
  templateUrl: './SettingsRowComponent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsRowComponent {
  // #region Properties

  /**
   * Setting label.
   *
   * @public
   * @readonly
   */
  public readonly label = input.required<string>();

  /**
   * One-line explanation of the setting.
   *
   * @public
   * @readonly
   */
  public readonly description = input<string>('');

  /**
   * The label split into search matches and the rest; when given, the matches are highlighted
   * instead of rendering `label` as plain text.
   *
   * @public
   * @readonly
   */
  public readonly labelParts = input<readonly ISettingsSearchTextPart[]>([]);

  // #endregion
}
