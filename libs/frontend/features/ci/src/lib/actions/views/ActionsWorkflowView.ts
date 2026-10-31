// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  AvatarComponent,
  BadgeComponent,
  ButtonComponent,
  EmptyStateComponent,
  IconComponent,
  IconNameDirective,
  ProgressRingComponent,
  SelectComponent,
  SelectItemComponent,
  SkeletonComponent,
  TableBodyCellComponent,
  TableBodyComponent,
  TableBodyRowComponent,
  TableComponent,
  TableHeaderCellComponent,
  TableHeaderComponent,
  TableHeaderRowComponent,
  TextBoxComponent,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { CiLogStatusLabelPipe, RelativeTimePipe } from '@symphony/frontend-ui';
import { ActionRunBadgePipe } from '../../pipes/ActionRunBadgePipe';
import { ActionRunDurationPipe } from '../../pipes/ActionRunDurationPipe';
import { ActionRunRevisionPipe } from '../../pipes/ActionRunRevisionPipe';
import { ActionRunnerLabelPipe } from '../../pipes/ActionRunnerLabelPipe';
import { ActionRunStartedPipe } from '../../pipes/ActionRunStartedPipe';
import { RunStepPresentationPipe } from '../../pipes/RunStepPresentationPipe';
import { ShortRevisionPipe } from '../../pipes/ShortRevisionPipe';
import { ActionsViewPresenter } from '../view-presenters/ActionsViewPresenter';

// #endregion

/**
 * A selected workflow: its file, `Run locally` and `Run on GitHub`, its runs, and the selected
 * run's steps, log excerpt and diagnosis with `Fix with AI`, `Rerun on GitHub` and
 * `Open in GitHub`.
 *
 * @public
 */
@Component({
  selector: 'symphony-actions-workflow-view',
  host: { class: 'flex min-w-0 flex-col gap-2.5' },
  imports: [
    ActionRunBadgePipe,
    ActionRunDurationPipe,
    ActionRunnerLabelPipe,
    ActionRunRevisionPipe,
    ActionRunStartedPipe,
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    CiLogStatusLabelPipe,
    EmptyStateComponent,
    FormsModule,
    IconComponent,
    IconNameDirective,
    ProgressRingComponent,
    RelativeTimePipe,
    RunStepPresentationPipe,
    SelectComponent,
    SelectItemComponent,
    ShortRevisionPipe,
    SkeletonComponent,
    TableBodyCellComponent,
    TableBodyComponent,
    TableBodyRowComponent,
    TableComponent,
    TableHeaderCellComponent,
    TableHeaderComponent,
    TableHeaderRowComponent,
    TextBoxComponent,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
  ],
  templateUrl: './ActionsWorkflowView.html',
  styleUrl: './ActionsWorkflowView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionsWorkflowView {
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
