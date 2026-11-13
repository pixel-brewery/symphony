// #region Imports

import { FormsModule } from '@angular/forms';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActionStateLabelPipe } from '../../../pipes/ActionStateLabelPipe';
import {
  TranslateDirective,
  AnchorComponent,
  ButtonComponent,
  CardComponent,
  DisclosureComponent,
  DrawerContentDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
  EmptyStateComponent,
  HintComponent,
  IconNameDirective,
  ProgressRingComponent,
  SkeletonComponent,
  TextBoxComponent,
  TimelineComponent,
  TimelineContentComponent,
  TimelineItemComponent,
  TimelineMarkerComponent,
  ToolbarComponent,
  TooltipComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { ApplicationDatePipe as DatePipe } from '@symphony/frontend-intl';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import {
  CiJobGraphComponent,
  CiLogStatusIconPipe,
  CiLogStatusLabelPipe,
  CiLogStatusVariantPipe,
} from '@symphony/frontend-ui';
import { ActionDrawerViewPresenter } from '../../view-presenters/ActionDrawerViewPresenter';

// #endregion

@Component({
  selector: 'symphony-action-drawer-view',
  host: { class: 'block' },
  imports: [
    TranslateDirective,
    FormsModule,
    ActionStateLabelPipe,
    CiJobGraphComponent,
    AnchorComponent,
    ButtonComponent,
    CardComponent,
    CiLogStatusIconPipe,
    CiLogStatusLabelPipe,
    CiLogStatusVariantPipe,
    DatePipe,
    DisclosureComponent,
    DrawerContentDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
    EmptyStateComponent,
    HintComponent,
    IconNameDirective,
    ProgressRingComponent,
    SkeletonComponent,
    TextBoxComponent,
    TimelineComponent,
    TimelineContentComponent,
    TimelineItemComponent,
    TimelineMarkerComponent,
    ToolbarComponent,
    TooltipComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: ActionDrawerViewPresenter }],
  templateUrl: './ActionDrawerView.html',
  styleUrl: './ActionDrawerView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionDrawerView extends View<ActionDrawerViewPresenter> {
  // #region Methods

  /**
   * Reveals the timeline entry for a job activated in the diagram.
   *
   * @param log - This drawer's scrollable log surface.
   * @param jobId - The selected execution identifier.
   * @public
   */
  public revealJob(log: HTMLElement, jobId: string): void {
    const job = log.querySelector<HTMLElement>(
      `[test-id="action-detail-job-${CSS.escape(jobId)}"]`,
    );
    if (!job) return;

    job.focus({ preventScroll: true });
    const viewport = log.getBoundingClientRect();
    const item = job.getBoundingClientRect();
    if (item.top < viewport.top || item.height >= viewport.height) {
      log.scrollTop += item.top - viewport.top;
    } else if (item.bottom > viewport.bottom) {
      log.scrollTop += item.bottom - viewport.bottom;
    }
  }

  // #endregion
}
