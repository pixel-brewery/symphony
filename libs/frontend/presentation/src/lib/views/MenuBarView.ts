// #region Imports

import { CommandDirective } from '@symphony/frontend-core';
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
  ButtonComponent,
  DividerComponent,
  HintComponent,
  IconComponent,
  IconNameDirective,
  MenuComponent,
  MenuItemComponent,
  ProgressBarComponent,
  ProgressRingComponent,
  TextComponent,
  ToggleSwitchComponent,
  TooltipDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { MenuBarViewPresenter } from '../view-presenters/MenuBarViewPresenter';
import { AutonomyNextCycleLabelPipe } from '../pipes/AutonomyNextCycleLabelPipe';
import { RailRunStatePresentationPipe } from '../pipes/RailRunStatePresentationPipe';
import { UpdateActionLabelPipe } from '@symphony/frontend-update';

// #endregion

@Component({
  selector: 'symphony-menu-bar-view',
  host: { class: 'block' },
  imports: [
    AutonomyNextCycleLabelPipe,
    ButtonComponent,
    CommandDirective,
    DividerComponent,
    HintComponent,
    IconComponent,
    IconNameDirective,
    MenuComponent,
    MenuItemComponent,
    ProgressBarComponent,
    ProgressRingComponent,
    RailRunStatePresentationPipe,
    TextComponent,
    ToggleSwitchComponent,
    TooltipDirective,
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

  private schedulePanelResize(): void {
    if (this._resizeFrame !== undefined) window.cancelAnimationFrame(this._resizeFrame);
    this._resizeFrame = window.requestAnimationFrame(() => {
      this._resizeFrame = undefined;
      const height = Math.min(
        620,
        Math.max(180, Math.ceil(this._panel().nativeElement.scrollHeight)),
      );
      if (height === this._requestedHeight) return;
      this._requestedHeight = height;
      void window.desktop.request('menu-bar.resize', { height }).catch(() => undefined);
    });
  }

  // #endregion
}
