// #region Imports

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CardComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { PseudoLinkDirective } from '@symphony/frontend-ui/mobile';
import type { IMobileDashboardFocus } from '../pipes/IMobileDashboardFocus';

// #endregion

@Component({
  selector: 'symphony-mobile-dashboard-focus',
  host: { class: 'block' },
  imports: [CardComponent, PseudoLinkDirective, RouterLink, TextComponent, TypographyDirective],
  templateUrl: './MobileDashboardFocusView.html',
  styleUrl: './MobileDashboardFocusView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileDashboardFocusView {
  // #region Fields

  /**
   * The focus.
   *
   * @public
   * @readonly
   */
  public readonly focus = input.required<IMobileDashboardFocus>();

  // #endregion
}
