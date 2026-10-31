// #region Imports

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import {
  AvatarComponent,
  AvatarGroupComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  CellComponent,
  CellGroupComponent,
  ExpanderComponent,
  TextComponent,
  TooltipDirective,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { AgentAvatarSourcePipe, HeadlineComponent } from '@symphony/frontend-ui';
import { ConnectionIconPipe } from '@symphony/frontend-ui';
import { ConnectionProviderLabelPipe } from '@symphony/frontend-ui';
import { PositionAuthorityLabelPipe } from '@symphony/frontend-ui';
import { RouteCostClassLabelPipe } from '@symphony/frontend-ui';
import { RouteCostPolicyLabelPipe } from '@symphony/frontend-ui';
import { RouteStrategyLabelPipe } from '@symphony/frontend-ui';
import { SkillFlowRoleLabelPipe } from '@symphony/frontend-ui';
import { TeamSettingsViewPresenter } from './TeamSettingsViewPresenter';

// #endregion

/** Actual Team workspace card, loaded through the native Settings slot. @public */
@Component({
  selector: 'symphony-team-settings-card',
  host: { class: 'block' },
  imports: [
    AgentAvatarSourcePipe,
    AvatarComponent,
    AvatarGroupComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CellComponent,
    CellGroupComponent,
    ConnectionIconPipe,
    ConnectionProviderLabelPipe,
    ExpanderComponent,
    HeadlineComponent,
    PositionAuthorityLabelPipe,
    RouteCostClassLabelPipe,
    RouteCostPolicyLabelPipe,
    RouteStrategyLabelPipe,
    SkillFlowRoleLabelPipe,
    TextComponent,
    TooltipDirective,
    IconNameDirective,
  ],
  providers: [TeamSettingsViewPresenter],
  templateUrl: './TeamSettingsCardView.html',
  styleUrl: './TeamSettingsCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamSettingsCardView {
  // #region Fields
  /** Feature-owned organization and commands. @protected @readonly */
  protected readonly presenter = inject(TeamSettingsViewPresenter);
  private readonly _changeDetector = inject(ChangeDetectorRef);
  // #endregion
  // #region Ctor
  /** Reuses the existing rendered organization refresh behavior. @public */
  public constructor() {
    effect(() => {
      const workspace = this.presenter.workspace();
      if (!workspace) return;
      this.presenter.workspaceOrganization()(workspace.id);
      window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }
  // #endregion
}
