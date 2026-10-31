// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AvatarComponent,
  ButtonComponent,
  IconNameDirective,
  DotComponent,
  IconComponent,
  ProgressRingComponent,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { DESKTOP_CLIENT } from '@symphony/frontend-core/desktop';
import { AgentActivityLabelPipe } from '../pipes/AgentActivityLabelPipe';
import { AgentActivityVariantPipe } from '../pipes/AgentActivityVariantPipe';
import { RailRunStatePresentationPipe } from '../pipes/RailRunStatePresentationPipe';
import { PresenterViewPresenter } from '../view-presenters/PresenterViewPresenter';

// #endregion

/**
 * The sidebar's run panel: the `Agents | Actions` switch with each agent's current activity or
 * the current action runs.
 *
 * @public
 */
@Component({
  selector: 'symphony-run-panel',
  host: { class: 'block' },
  imports: [
    AgentActivityLabelPipe,
    AgentActivityVariantPipe,
    AvatarComponent,
    ButtonComponent,
    IconNameDirective,
    DotComponent,
    IconComponent,
    ProgressRingComponent,
    RailRunStatePresentationPipe,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
  ],
  templateUrl: './RunPanelView.html',
  styleUrl: './RunPanelView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RunPanelView {
  // #region Fields

  protected readonly presenter = inject(PresenterViewPresenter);

  private readonly _desktop = inject(DESKTOP_CLIENT);

  // #endregion

  // #region Methods

  /** Opens Settings at the active workspace's AI team, where agents are added. */
  protected openAiTeam(): void {
    const workspaceId = this.presenter.activeWorkspace()?.id;
    void this._desktop.request('settings.open', {
      parameters: { ...(workspaceId ? { workspace: workspaceId } : {}), section: 'team' },
    });
  }

  // #endregion
}
