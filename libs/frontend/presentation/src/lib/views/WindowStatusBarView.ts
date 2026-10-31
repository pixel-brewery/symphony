// #region Imports

import { DatePipe, DecimalPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  ButtonComponent,
  IconNameDirective,
  IconComponent,
  ProgressRingComponent,
  TooltipDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { NotificationBellView } from '@symphony/frontend-notification/views';
import { RelativeTimePipe } from '@symphony/frontend-ui';
import { PresenterViewPresenter } from '../view-presenters/PresenterViewPresenter';

// #endregion

/**
 * The 28px status bar along the bottom edge of the main window: the GitHub sync state, the
 * notification bell, the app version and the app-update button.
 *
 * @public
 */
@Component({
  selector: 'symphony-window-status-bar',
  host: { class: 'block' },
  imports: [
    ButtonComponent,
    IconNameDirective,
    DatePipe,
    DecimalPipe,
    IconComponent,
    NotificationBellView,
    ProgressRingComponent,
    RelativeTimePipe,
    TooltipDirective,
  ],
  templateUrl: './WindowStatusBarView.html',
  styleUrl: './WindowStatusBarView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WindowStatusBarView {
  // #region Fields

  protected readonly presenter = inject(PresenterViewPresenter);

  // #endregion
}
