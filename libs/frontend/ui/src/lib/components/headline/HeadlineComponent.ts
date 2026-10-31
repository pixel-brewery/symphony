// #region Imports

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { TextComponent, TypographyDirective } from '@pixel-brewery/mosaik-elements-angular';

// #endregion

@Component({
  selector: 'symphony-headline',
  imports: [TextComponent, TypographyDirective],
  templateUrl: './HeadlineComponent.html',
  styleUrl: './HeadlineComponent.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeadlineComponent {
  // #region Fields

  /**
   * The header.
   *
   * @public
   * @readonly
   */
  public readonly header = input.required<string>();

  /**
   * The description.
   *
   * @public
   * @readonly
   */
  public readonly description = input.required<string>();

  /**
   * The disabled.
   *
   * @public
   * @readonly
   */
  public readonly disabled = input(false);

  // #endregion
}
