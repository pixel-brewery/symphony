// #region Imports

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TextComponent, TypographyDirective } from '@pixel-brewery/mosaik-elements-angular';

// #endregion

/**
 * A dashed frame around content that appears only in some situations, labelled with that condition
 * (for example `While a workspace is disabled`), as the Settings design draws such states.
 *
 * @public
 */
@Component({
  selector: 'symphony-settings-conditional',
  host: {
    class: 'flex min-w-0 flex-col gap-1 px-1.5 pt-[10px] pb-1.5',
    part: 'settings-conditional',
  },
  imports: [TextComponent, TypographyDirective],
  templateUrl: './SettingsConditionalComponent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsConditionalComponent {
  // #region Properties

  /**
   * The situation in which the content appears.
   *
   * @public
   * @readonly
   */
  public readonly condition = input.required<string>();

  // #endregion
}
