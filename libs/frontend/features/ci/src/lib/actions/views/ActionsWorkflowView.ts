// #region Imports

import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  TranslateDirective,
  BannerComponent,
  BadgeComponent,
  ButtonComponent,
  EmptyStateComponent,
  IconNameDirective,
  ProgressRingComponent,
  SelectComponent,
  SelectItemComponent,
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
import { ContextMenuTriggerDirective, type ContextMenuComponent } from '@pixel-brewery/ngpel-ui';
import { ActionRunBadgePipe } from '../../pipes/ActionRunBadgePipe';
import { ActionRunDurationPipe } from '../../pipes/ActionRunDurationPipe';
import { ActionRunRevisionPipe } from '../../pipes/ActionRunRevisionPipe';
import { ActionRunnerLabelPipe } from '../../pipes/ActionRunnerLabelPipe';
import { ActionRunStartedPipe } from '../../pipes/ActionRunStartedPipe';
import { ActionsViewPresenter } from '../view-presenters/ActionsViewPresenter';

// #endregion

/**
 * Displays workflow dispatch, the run history and the selected failed run's diagnosis.
 *
 * @public
 */
@Component({
  selector: 'symphony-actions-workflow-view',
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col gap-2.5 overflow-clip' },
  imports: [
    TranslateDirective,
    ActionRunBadgePipe,
    ActionRunDurationPipe,
    ActionRunnerLabelPipe,
    ActionRunRevisionPipe,
    ActionRunStartedPipe,
    BannerComponent,
    BadgeComponent,
    ButtonComponent,
    ContextMenuTriggerDirective,
    EmptyStateComponent,
    FormsModule,
    IconNameDirective,
    ProgressRingComponent,
    SelectComponent,
    SelectItemComponent,
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

  /**
   * The shared context menu for rows in the Actions tables.
   *
   * @public
   * @readonly
   */
  public readonly runMenu = input.required<ContextMenuComponent>();

  /**
   * The failed run whose diagnosis is expanded.
   *
   * @protected
   * @readonly
   */
  protected readonly expandedDiagnosisId = signal<string | undefined>(undefined);

  // #endregion
}
