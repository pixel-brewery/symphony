// #region Imports

import { ApplicationDatePipe as DatePipe, translateLabel } from '@symphony/frontend-intl';
import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed } from '@angular/core';
import {
  TranslateDirective,
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  DropDownButtonComponent,
  EmptyStateComponent,
  FlowBoardColumnComponent,
  FlowBoardComponent,
  HintComponent,
  IconNameDirective,
  MenuComponent,
  MenuItemComponent,
  SkeletonComponent,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER, WindowToolbarDirective } from '@symphony/frontend-core';
import { BooleanIconPipe } from '@symphony/frontend-ui';
import { BoardColumnEntryComponent } from '../components/BoardColumnEntryComponent';
import { BoardSourceSummaryPipe } from '../pipes/BoardSourceSummaryPipe';
import { WorkspaceSelectionSummaryPipe } from '../pipes/WorkspaceSelectionSummaryPipe';
import { BoardViewPresenter } from '../view-presenters/BoardViewPresenter';

// #endregion

@Component({
  selector: 'symphony-board-view',
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col' },
  imports: [
    TranslateDirective,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    BoardColumnEntryComponent,
    BoardSourceSummaryPipe,
    BooleanIconPipe,
    ButtonComponent,
    DatePipe,
    DropDownButtonComponent,
    EmptyStateComponent,
    FlowBoardColumnComponent,
    FlowBoardComponent,
    HintComponent,
    IconNameDirective,
    MenuComponent,
    MenuItemComponent,
    NgTemplateOutlet,
    SkeletonComponent,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
    WindowToolbarDirective,
    WorkspaceSelectionSummaryPipe,
  ],
  providers: [BoardViewPresenter, { provide: VIEW_PRESENTER, useExisting: BoardViewPresenter }],
  templateUrl: './BoardView.html',
  styleUrl: './BoardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardView extends View<BoardViewPresenter> {
  // #region Fields

  /**
   * Labels and announcements for the native FlowBoard controls.
   *
   * @protected
   * @readonly
   */
  protected readonly boardIntl = computed(() => ({
    boardLabel: translateLabel('loc.symphony.labels.board.4816cbf'),
    expandColumnLabel: translateLabel('loc.symphony.labels.expand.column.86f73ad'),
    collapseColumnLabel: translateLabel('loc.symphony.labels.collapse.column.0aadc07'),
    selectItemLabel: translateLabel('loc.symphony.labels.select.work.item.7fd6d96'),
    columnLabel: translateLabel(
      'loc.symphony.labels.0.1.work.items.249f37e',
      '{column}',
      '{count}',
    ),
    columnLabelSingle: translateLabel('loc.symphony.labels.0.1.work.item.f8e8baf', '{column}'),
    itemMovedAnnouncement: translateLabel(
      'loc.symphony.labels.0.moved.to.1.position.2.of.3.f538a2b',
      '{item}',
      '{column}',
      '{position}',
      '{count}',
    ),
    itemsMovedAnnouncement: translateLabel(
      'loc.symphony.labels.0.cards.moved.to.1.9acac80',
      '{count}',
      '{column}',
    ),
    dropBlockedLabel: translateLabel('loc.symphony.labels.this.destination.is.not.allowed.717a149'),
    moveBlockedAnnouncement: translateLabel(
      'loc.symphony.labels.0.cannot.be.moved.there.a1b8767',
      '{item}',
    ),
  }));

  // #endregion
}
