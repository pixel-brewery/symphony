// #region Imports

import { ChangeDetectionStrategy, Component, inject, TemplateRef, viewChild } from '@angular/core';
import {
  TranslateDirective,
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
  VirtualItemContentDirective,
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
 * Declares the card template projected directly into a Mosaik board column.
 *
 * @public
 */
@Component({
  selector: 'symphony-board-column-entry',
  host: { class: 'hidden' },
  imports: [
    TranslateDirective,
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
    VirtualItemContentDirective,
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
   * Entry template with the logical board entry supplied by the column.
   *
   * @public
   * @readonly
   */
  public readonly template =
    viewChild<TemplateRef<{ $implicit: IBoardColumnEntry }>>('entryTemplate');

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
   * Opens a delivery group when the group card itself is activated.
   *
   * @param event - Mosaik activation detail, which can also bubble from a group member.
   * @param groupId - Stable delivery-group id.
   * @protected
   */
  protected openGroupFromCard(event: unknown, groupId: string): void {
    const detail = event as { readonly itemKey?: unknown } | null;
    if (detail?.itemKey === groupId) void this.presenter.openDeliveryGroup(groupId);
  }

  /**
   * Opens a card activated by the keyboard. Pointer activation is handled separately for selection.
   *
   * @param event - Mosaik activation detail.
   * @param workItemId - Stable work-item id.
   * @protected
   */
  protected openTaskFromKeyboard(event: unknown, workItemId: string): void {
    const detail = event as { readonly trigger?: unknown } | null;
    if (detail?.trigger === 'keyboard') this.presenter.openTaskCommand.execute(workItemId);
  }

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
