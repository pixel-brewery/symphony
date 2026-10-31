// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  BadgeComponent,
  ButtonComponent,
  IconNameDirective,
  ProgressRingComponent,
  TableBodyCellComponent,
  TableBodyComponent,
  TableBodyRowComponent,
  TableComponent,
  TableHeaderCellComponent,
  TableHeaderComponent,
  TableHeaderRowComponent,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { RelativeTimePipe } from '@symphony/frontend-ui';
import { ActionRunBadgePipe } from '../../pipes/ActionRunBadgePipe';
import { ActionRunDurationPipe } from '../../pipes/ActionRunDurationPipe';
import { ActionRunRevisionPipe } from '../../pipes/ActionRunRevisionPipe';
import { ActionRunnerLabelPipe } from '../../pipes/ActionRunnerLabelPipe';
import { ActionRunStartedPipe } from '../../pipes/ActionRunStartedPipe';
import { ActionsViewPresenter } from '../view-presenters/ActionsViewPresenter';

// #endregion

/**
 * `All runs`: every running and queued run across the workflows with their controls, and the
 * finished runs of all workflows, newest first.
 *
 * @public
 */
@Component({
  selector: 'symphony-actions-all-runs-view',
  host: { class: 'flex min-w-0 flex-col gap-2.5' },
  imports: [
    ActionRunBadgePipe,
    ActionRunDurationPipe,
    ActionRunnerLabelPipe,
    ActionRunRevisionPipe,
    ActionRunStartedPipe,
    BadgeComponent,
    ButtonComponent,
    IconNameDirective,
    ProgressRingComponent,
    RelativeTimePipe,
    TableBodyCellComponent,
    TableBodyComponent,
    TableBodyRowComponent,
    TableComponent,
    TableHeaderCellComponent,
    TableHeaderComponent,
    TableHeaderRowComponent,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
  ],
  templateUrl: './ActionsAllRunsView.html',
  styleUrl: './ActionsAllRunsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionsAllRunsView {
  // #region Fields

  /**
   * The screen's presenter, provided by the `Actions` view.
   *
   * @protected
   * @readonly
   */
  protected readonly presenter = inject(ActionsViewPresenter);

  // #endregion
}
