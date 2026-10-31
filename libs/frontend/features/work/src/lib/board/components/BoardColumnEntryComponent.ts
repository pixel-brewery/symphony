// #region Imports

import { ChangeDetectionStrategy, Component, computed, inject, input } from '@angular/core';
import {
  AvatarComponent,
  BadgeComponent,
  ButtonComponent,
  DividerComponent,
  DropDownButtonComponent,
  FlowBoardColumnItemComponent,
  FlowBoardColumnItemGroupComponent,
  HintComponent,
  IconComponent,
  IconNameDirective,
  MenuComponent,
  MenuItemComponent,
  ProgressBarComponent,
  ProgressRingComponent,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { HoverRevealForDirective } from '@symphony/frontend-ui';
import { BoardCardStatusPresentationPipe } from '../pipes/BoardCardStatusPresentationPipe';
import { WorkItemHealthPresentationPipe } from '../pipes/WorkItemHealthPresentationPipe';
import { WorkItemLinkPresentationPipe } from '../pipes/WorkItemLinkPresentationPipe';
import { BOARD_DELIVERY_STEP_COUNT } from '../view-presenters/boardCard';
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
  host: { class: 'block w-full min-w-0 max-w-full pb-[6px]' },
  imports: [
    AvatarComponent,
    BadgeComponent,
    BoardCardStatusPresentationPipe,
    ButtonComponent,
    DividerComponent,
    DropDownButtonComponent,
    FlowBoardColumnItemComponent,
    FlowBoardColumnItemGroupComponent,
    HintComponent,
    HoverRevealForDirective,
    IconComponent,
    IconNameDirective,
    MenuComponent,
    MenuItemComponent,
    ProgressBarComponent,
    ProgressRingComponent,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
    WorkItemHealthPresentationPipe,
    WorkItemLinkPresentationPipe,
  ],
  templateUrl: './BoardColumnEntryComponent.html',
  styleUrl: './BoardColumnEntryComponent.scss',
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

  /** Number of delivery steps on the card's progress bar. */
  protected readonly deliveryStepCount = BOARD_DELIVERY_STEP_COUNT;

  /** Zero-based delivery steps the progress bar draws, one segment each. */
  protected readonly deliverySteps = Array.from(
    { length: BOARD_DELIVERY_STEP_COUNT },
    (_step, index) => index,
  );

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
