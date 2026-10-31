// #region Imports

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TextComponent, TypographyDirective } from '@pixel-brewery/mosaik-elements-angular';

// #endregion

/**
 * One titled group of a Settings section: a heading with a one-line description and optional
 * actions on the right (`slot="actions"`), above a framed list of `symphony-settings-row`s.
 * `level="section"` draws the larger heading of a page made of several topics, such as `System`.
 *
 * @public
 */
@Component({
  selector: 'symphony-settings-group',
  host: {
    part: 'settings-group',
    '[class]':
      "level() === 'section' ? 'flex min-w-0 flex-col gap-2' : 'flex min-w-0 flex-col gap-1'",
  },
  imports: [TextComponent, TypographyDirective],
  templateUrl: './SettingsGroupComponent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsGroupComponent {
  // #region Properties

  /**
   * Group heading.
   *
   * @public
   * @readonly
   */
  public readonly heading = input.required<string>();

  /**
   * One-line description under the heading.
   *
   * @public
   * @readonly
   */
  public readonly description = input<string>('');

  /**
   * Whether the rows sit in the shared framed surface (default) or stand on their own, for groups
   * of cards such as the agent cards.
   *
   * @public
   * @readonly
   */
  public readonly framed = input<boolean>(true);

  /**
   * `group` (default) for a titled group inside a section, `section` for a topic heading on a page
   * of several topics.
   *
   * @public
   * @readonly
   */
  public readonly level = input<'group' | 'section'>('group');

  // #endregion
}
