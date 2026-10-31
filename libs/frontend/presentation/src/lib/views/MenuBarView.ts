// #region Imports

import { DecimalPipe, LowerCasePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import {
  BadgeComponent,
  ButtonComponent,
  DividerComponent,
  IconComponent,
  IconNameDirective,
  ImageComponent,
  KbdComponent,
  ProgressBarComponent,
  ProgressRingComponent,
  SegmentComponent,
  SegmentItemComponent,
  TextComponent,
  ToggleSwitchComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { CommandDirective } from '@symphony/frontend-core';
import { NotificationIconPipe } from '@symphony/frontend-notification';
import { AgentAvatarSourcePipe, RelativeTimePipe } from '@symphony/frontend-ui';
import { UpdateActionLabelPipe } from '@symphony/frontend-update';
import { AgentActivityIconPipe } from '../pipes/AgentActivityIconPipe';
import { AgentActivityLabelPipe } from '../pipes/AgentActivityLabelPipe';
import { AgentFinishedWorkLabelPipe } from '../pipes/AgentFinishedWorkLabelPipe';
import { AutonomyNextCycleLabelPipe } from '../pipes/AutonomyNextCycleLabelPipe';
import { RailRunStatePresentationPipe } from '../pipes/RailRunStatePresentationPipe';
import { MenuBarViewPresenter } from '../view-presenters/MenuBarViewPresenter';

// #endregion

/** The main process accepts panel heights between these bounds. */
const MINIMUM_PANEL_HEIGHT = 180;
const MAXIMUM_PANEL_HEIGHT = 760;

/**
 * The menu-bar panel (tray): a 328 px window of its own with the runs, the execution slots, what
 * needs the user, autonomous work, the update and the application commands with their shortcuts.
 *
 * @public
 */
@Component({
  selector: 'symphony-menu-bar-view',
  host: {
    class: 'block',
    '(document:keydown)': 'onKeydown($event)',
  },
  imports: [
    AgentActivityIconPipe,
    AgentActivityLabelPipe,
    AgentAvatarSourcePipe,
    AgentFinishedWorkLabelPipe,
    AutonomyNextCycleLabelPipe,
    BadgeComponent,
    ButtonComponent,
    CommandDirective,
    DecimalPipe,
    DividerComponent,
    IconComponent,
    IconNameDirective,
    ImageComponent,
    KbdComponent,
    LowerCasePipe,
    NotificationIconPipe,
    ProgressBarComponent,
    ProgressRingComponent,
    RailRunStatePresentationPipe,
    RelativeTimePipe,
    SegmentComponent,
    SegmentItemComponent,
    TextComponent,
    ToggleSwitchComponent,
    TooltipDirective,
    TypographyDirective,
    UpdateActionLabelPipe,
  ],
  providers: [MenuBarViewPresenter],
  templateUrl: './MenuBarView.html',
  styleUrl: './MenuBarView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MenuBarView {
  // #region Fields

  private readonly _destroyRef = inject(DestroyRef);
  private readonly _panel = viewChild.required<ElementRef<HTMLElement>>('panel');
  private _resizeFrame?: number;
  private _requestedHeight?: number;
  protected readonly presenter: MenuBarViewPresenter;

  // #endregion

  // #region Ctor

  public constructor(presenter: MenuBarViewPresenter) {
    this.presenter = presenter;
    void presenter.initialize();
    afterNextRender(() => {
      const panel = this._panel().nativeElement;
      const resizeObserver = new ResizeObserver(() => this.schedulePanelResize());
      const mutationObserver = new MutationObserver(() => this.schedulePanelResize());
      resizeObserver.observe(panel);
      mutationObserver.observe(panel, { attributes: true, childList: true, subtree: true });
      this.schedulePanelResize();
      this._destroyRef.onDestroy(() => {
        resizeObserver.disconnect();
        mutationObserver.disconnect();
        if (this._resizeFrame !== undefined) window.cancelAnimationFrame(this._resizeFrame);
      });
    });
  }

  // #endregion

  // #region Methods

  /**
   * Runs the panel commands for their shortcuts: ⌘O, ⌘N, ⌘, and ⌘Q.
   *
   * @param event - The key press anywhere in the panel.
   */
  protected onKeydown(event: KeyboardEvent): void {
    if (!event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
    const command =
      event.key === 'o' || event.key === 'O'
        ? this.presenter.openSymphonyCommand
        : event.key === 'n' || event.key === 'N'
          ? this.presenter.newWorkItemCommand
          : event.key === ','
            ? this.presenter.openSettingsCommand
            : event.key === 'q' || event.key === 'Q'
              ? this.presenter.quitSymphonyCommand
              : undefined;
    if (!command) return;
    event.preventDefault();
    command.execute();
  }

  private schedulePanelResize(): void {
    if (this._resizeFrame !== undefined) window.cancelAnimationFrame(this._resizeFrame);
    this._resizeFrame = window.requestAnimationFrame(() => {
      this._resizeFrame = undefined;
      const height = Math.min(
        MAXIMUM_PANEL_HEIGHT,
        Math.max(MINIMUM_PANEL_HEIGHT, Math.ceil(this._panel().nativeElement.scrollHeight)),
      );
      if (height === this._requestedHeight) return;
      this._requestedHeight = height;
      void window.desktop.request('menu-bar.resize', { height }).catch(() => undefined);
    });
  }

  // #endregion
}
