// #region Imports

import { CdkTrapFocus } from '@angular/cdk/a11y';
import {
  CdkConnectedOverlay,
  CdkOverlayOrigin,
  type ConnectedPosition,
} from '@angular/cdk/overlay';
import { ApplicationDatePipe as DatePipe } from '@symphony/frontend-intl';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  TranslateDirective,
  BadgeComponent,
  ButtonComponent,
  DotComponent,
  EmptyStateComponent,
  IconComponent,
  IconNameDirective,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { NotificationActionAppearancePipe } from '../pipes/NotificationActionAppearancePipe';
import { NotificationIconPipe } from '../pipes/NotificationIconPipe';
import { NotificationScopeListPipe } from '../pipes/NotificationScopeListPipe';
import { NotificationBellViewPresenter } from '../view-presenters/NotificationBellViewPresenter';

// #endregion

/**
 * The status bar's notification bell: the count of what needs attention, and the notification
 * centre that opens upwards from it over the current view.
 *
 * @public
 */
@Component({
  selector: 'symphony-notification-bell',
  host: { class: 'block' },
  imports: [
    TranslateDirective,
    BadgeComponent,
    ButtonComponent,
    CdkConnectedOverlay,
    CdkOverlayOrigin,
    CdkTrapFocus,
    DatePipe,
    DotComponent,
    EmptyStateComponent,
    IconComponent,
    IconNameDirective,
    NotificationActionAppearancePipe,
    NotificationIconPipe,
    NotificationScopeListPipe,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
  ],
  providers: [NotificationBellViewPresenter],
  templateUrl: './NotificationBellView.html',
  styleUrl: './NotificationBellView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationBellView {
  // #region Fields

  /**
   * The popover opens upwards from the bell, its right edge just past the bell's.
   */
  protected readonly positions: ConnectedPosition[] = [
    {
      originX: 'end',
      originY: 'top',
      overlayX: 'end',
      overlayY: 'bottom',
      offsetX: 4,
      offsetY: -8,
    },
  ];

  protected readonly presenter = inject(NotificationBellViewPresenter);

  // #endregion
}
