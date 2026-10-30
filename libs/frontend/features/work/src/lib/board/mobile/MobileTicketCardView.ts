// #region Imports

import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  BadgeComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { PseudoLinkDirective } from '@symphony/frontend-ui/mobile';
import type { MobileTicket } from '@symphony/mobile-contracts';

// #endregion

@Component({
  selector: 'symphony-mobile-ticket-card',
  host: { class: 'block' },
  imports: [
    BadgeComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    PseudoLinkDirective,
    RouterLink,
  ],
  templateUrl: './MobileTicketCardView.html',
  styleUrl: './MobileTicketCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileTicketCardView {
  // #region Fields

  /**
   * The ticket.
   *
   * @public
   * @readonly
   */
  public readonly ticket = input.required<MobileTicket>();

  // #endregion
}
