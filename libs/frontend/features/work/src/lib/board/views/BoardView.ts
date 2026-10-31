// #region Imports

import { DatePipe } from '@angular/common';
import { type CdkDragDrop, CdkDrag, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import { CdkVirtualForOf, CdkVirtualScrollViewport } from '@angular/cdk/scrolling';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
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
import { DynamicSizeVirtualScrollDirective } from '../directives/DynamicSizeVirtualScrollDirective';
import { BoardSourceSummaryPipe } from '../pipes/BoardSourceSummaryPipe';
import { WorkspaceSelectionSummaryPipe } from '../pipes/WorkspaceSelectionSummaryPipe';
import { BoardViewPresenter } from '../view-presenters/BoardViewPresenter';
import type { IBoardColumnEntry } from '../view-presenters/IBoardColumnEntry';

// #endregion

@Component({
  selector: 'symphony-board-view',
  host: { class: 'flex min-h-0 min-w-0 flex-1 flex-col' },
  imports: [
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    BoardColumnEntryComponent,
    BoardSourceSummaryPipe,
    BooleanIconPipe,
    ButtonComponent,
    CdkDrag,
    CdkDropList,
    CdkDropListGroup,
    CdkVirtualForOf,
    CdkVirtualScrollViewport,
    DatePipe,
    DropDownButtonComponent,
    DynamicSizeVirtualScrollDirective,
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
    WindowToolbarDirective,
    WorkspaceSelectionSummaryPipe,
  ],
  providers: [BoardViewPresenter, { provide: VIEW_PRESENTER, useExisting: BoardViewPresenter }],
  templateUrl: './BoardView.html',
  styleUrl: './BoardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardView extends View<BoardViewPresenter> {
  // #region Methods

  /**
   * Moves one virtualized entry when it is dropped onto another board column.
   *
   * @param event - CDK drop event carrying the logical entry and target column key.
   * @protected
   */
  protected moveVirtualizedEntry(event: CdkDragDrop<string, string, IBoardColumnEntry>): void {
    const targetEntry = this.boardEntryAt(event.dropPoint.x, event.dropPoint.y);
    if (targetEntry && targetEntry.id !== event.item.data.id) {
      const sourceMemberKeys =
        event.item.data.kind === 'group'
          ? event.item.data.group.workItemIds
          : [event.item.data.item.id];
      const targetRootItemKey =
        targetEntry.kind === 'group' ? targetEntry.group.rootWorkItemId : targetEntry.item.id;
      void this.presenter.groupBoardItems({ sourceMemberKeys, targetRootItemKey });
      return;
    }
    if (event.previousContainer === event.container) return;
    void this.presenter.moveBoardEntry({
      itemKey: event.item.data.id,
      toColumnKey: event.container.data,
    });
  }

  /**
   * Resolves a rendered entry under the CDK pointer so dropping directly on a card retains the
   * FlowBoard grouping gesture while dropping into column space remains a column move.
   *
   * @param x - Viewport x coordinate.
   * @param y - Viewport y coordinate.
   * @returns The rendered target entry, when the pointer is over one.
   * @private
   */
  private boardEntryAt(x: number, y: number): IBoardColumnEntry | undefined {
    const host = document
      .elementsFromPoint(x, y)
      .find((element) => element.matches('symphony-board-column-entry')) as HTMLElement | undefined;
    const entryKey = host?.dataset['boardVirtualKey'];
    if (!entryKey) return undefined;
    for (const column of this.presenter.columns()) {
      const entry = this.presenter
        .columnEntries(column.id)
        .find((candidate) => candidate.id === entryKey);
      if (entry) return entry;
    }
    return undefined;
  }

  // #endregion
}
