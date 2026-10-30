// #region Imports

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  AvatarComponent,
  AvatarGroupComponent,
  BadgeComponent,
  ButtonComponent,
  ChipComponent,
  DividerComponent,
  DropDownButtonComponent,
  FlowBoardColumnItemComponent,
  FlowBoardColumnItemGroupComponent,
  HintComponent,
  IconComponent,
  IconNameDirective,
  MenuComponent,
  MenuItemComponent,
  ProgressRingComponent,
  TextComponent,
  TooltipComponent,
  TooltipDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  HoverRevealForDirective,
  MarkdownComponent,
  TruncateStartPipe,
} from '@symphony/frontend-ui';
import { TaskRuntimePresentationPipe } from '../pipes/TaskRuntimePresentationPipe';
import { WorkItemHealthPresentationPipe } from '../pipes/WorkItemHealthPresentationPipe';
import { WorkItemLinkPresentationPipe } from '../pipes/WorkItemLinkPresentationPipe';
import { BoardViewPresenter } from '../view-presenters/BoardViewPresenter';
import type { IBoardColumnEntry } from '../view-presenters/IBoardColumnEntry';

// #endregion

/**
 * Renders one logical board entry inside the column's virtual viewport.
 *
 * @public
 */
@Component({
  selector: 'symphony-board-column-entry',
  host: { class: 'block w-full min-w-0 max-w-full' },
  imports: [
    AvatarComponent,
    AvatarGroupComponent,
    BadgeComponent,
    ButtonComponent,
    ChipComponent,
    DatePipe,
    DividerComponent,
    DropDownButtonComponent,
    FlowBoardColumnItemComponent,
    FlowBoardColumnItemGroupComponent,
    HintComponent,
    HoverRevealForDirective,
    IconComponent,
    IconNameDirective,
    MarkdownComponent,
    MenuComponent,
    MenuItemComponent,
    ProgressRingComponent,
    TaskRuntimePresentationPipe,
    TextComponent,
    TooltipComponent,
    TooltipDirective,
    TruncateStartPipe,
    WorkItemHealthPresentationPipe,
    WorkItemLinkPresentationPipe,
  ],
  templateUrl: './BoardColumnEntryComponent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BoardColumnEntryComponent {
  // #region Fields

  /**
   * Logical group or standalone work item rendered by this recycled view.
   *
   * @public
   * @readonly
   */
  public readonly entry = input.required<IBoardColumnEntry>();

  /** Delivery group when this recycled view represents a group. */
  protected readonly group = computed(() => {
    const entry = this.entry();
    return entry.kind === 'group' ? entry.group : undefined;
  });

  /** Work item when this recycled view represents a standalone card. */
  protected readonly item = computed(() => {
    const entry = this.entry();
    return entry.kind === 'item' ? entry.item : undefined;
  });

  /** Owning board presenter shared with the route view. */
  protected readonly presenter = inject(BoardViewPresenter);
  /** Existing Workflow availability from the actual owning Board presenter. @protected @readonly */
  protected readonly workflowAvailable = this.presenter.workflowAvailable;

  // #endregion

  // #region Methods

  /**
   * Toggles the selection of one card.
   *
   * @param workItemId - Stable work-item id.
   * @protected
   */
  protected toggleCardSelection(workItemId: string): void {
    this.presenter.setItemSelected(workItemId, !this.presenter.isSelected(workItemId));
  }

  // #endregion
}
