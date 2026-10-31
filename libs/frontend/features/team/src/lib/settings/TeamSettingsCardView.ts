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
  ButtonComponent,
  CardComponent,
  ChipComponent,
  DividerComponent,
  DotComponent,
  ExpanderComponent,
  IconComponent,
  IconNameDirective,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { SettingsGroupComponent, SettingsRowComponent } from '@symphony/frontend-setting';
import {
  AgentFigureComponent,
  ConnectionIconPipe,
  ConnectionProviderLabelPipe,
  PositionAuthorityLabelPipe,
  RouteCostClassLabelPipe,
  RouteCostPolicyLabelPipe,
  RouteStrategyLabelPipe,
  SkillFlowRoleLabelPipe,
} from '@symphony/frontend-ui';
import { AgentAvailabilityLabelPipe } from '../pipes/AgentAvailabilityLabelPipe';
import { AgentAvailabilityVariantPipe } from '../pipes/AgentAvailabilityVariantPipe';
import { AgentBackupNamesPipe } from '../pipes/AgentBackupNamesPipe';
import { AgentModelLabelPipe } from '../pipes/AgentModelLabelPipe';
import { SettingNamePipe } from '../pipes/SettingNamePipe';
import { SkillFlowRoleLabelsPipe } from '../pipes/SkillFlowRoleLabelsPipe';
import { TeamSettingsViewPresenter } from './TeamSettingsViewPresenter';

// #endregion

/**
 * The `AI team` section of a workspace in the Settings window: the delivery flow with who does each
 * step, the agent cards and the technical AI setup.
 *
 * @public
 */
@Component({
  selector: 'symphony-team-settings-card',
  host: { class: 'block min-w-0' },
  imports: [
    AgentAvailabilityLabelPipe,
    AgentAvailabilityVariantPipe,
    AgentBackupNamesPipe,
    AgentFigureComponent,
    AgentModelLabelPipe,
    AvatarComponent,
    ButtonComponent,
    CardComponent,
    ChipComponent,
    ConnectionIconPipe,
    ConnectionProviderLabelPipe,
    DividerComponent,
    DotComponent,
    ExpanderComponent,
    IconComponent,
    IconNameDirective,
    PositionAuthorityLabelPipe,
    RouteCostClassLabelPipe,
    RouteCostPolicyLabelPipe,
    RouteStrategyLabelPipe,
    SettingNamePipe,
    SettingsGroupComponent,
    SettingsRowComponent,
    SkillFlowRoleLabelPipe,
    SkillFlowRoleLabelsPipe,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
  ],
  providers: [TeamSettingsViewPresenter],
  templateUrl: './TeamSettingsCardView.html',
  styleUrl: './TeamSettingsCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamSettingsCardView {
  // #region Fields

  /**
   * Feature-owned organization, projections and commands.
   *
   * @protected
   * @readonly
   */
  protected readonly presenter = inject(TeamSettingsViewPresenter);

  private readonly _changeDetector = inject(ChangeDetectorRef);

  // #endregion

  // #region Ctor

  /**
   * Reuses the existing rendered organization refresh behavior.
   *
   * @public
   */
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
