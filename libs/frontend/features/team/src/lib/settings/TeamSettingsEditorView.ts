// #region Imports

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { TeamSettingsEditorViewPresenter } from './TeamSettingsEditorViewPresenter';
import {
  AgentFigureComponent,
  AiAccountStatusPipe,
  AiValidationIssuesLabelPipe,
  ConnectionIconPipe,
  DeliveryFlowStepPipe,
  SelectionAppearancePipe,
  SkillFlowRoleLabelPipe,
} from '@symphony/frontend-ui';
import {
  AvatarComponent,
  ButtonComponent,
  CardComponent,
  CheckboxComponent,
  ChipComponent,
  ChoiceComponent,
  ChoiceGroupComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  DismissComponent,
  DividerComponent,
  ExpanderComponent,
  IconComponent,
  IconNameDirective,
  MessageComponent,
  NumberBoxComponent,
  SelectComponent,
  SelectItemComponent,
  TextBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { SettingNamePipe } from '../pipes/SettingNamePipe';

// #endregion

/**
 * The agent sheet of the Settings window (`Edit AI agent` / `Add AI agent`).
 *
 * @public
 */
@Component({
  selector: 'symphony-team-settings-editor-view',
  host: { class: 'block' },
  imports: [
    AgentFigureComponent,
    AiAccountStatusPipe,
    AiValidationIssuesLabelPipe,
    AvatarComponent,
    ButtonComponent,
    CardComponent,
    CheckboxComponent,
    ChipComponent,
    ChoiceComponent,
    ChoiceGroupComponent,
    ConnectionIconPipe,
    DeliveryFlowStepPipe,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    DismissComponent,
    DividerComponent,
    ExpanderComponent,
    IconComponent,
    IconNameDirective,
    MessageComponent,
    NumberBoxComponent,
    SelectComponent,
    SelectItemComponent,
    SelectionAppearancePipe,
    SettingNamePipe,
    SkillFlowRoleLabelPipe,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: TeamSettingsEditorViewPresenter }],
  templateUrl: './TeamSettingsEditorView.html',
  styleUrl: './TeamSettingsEditorView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TeamSettingsEditorView extends View<TeamSettingsEditorViewPresenter> {
  // #region Fields
  private readonly _changeDetector = inject(ChangeDetectorRef);
  // #endregion
  // #region Ctor
  /** Retains native sheet rendering after the existing hydration lifecycle. @public */
  public constructor() {
    super();
    effect(() => {
      if (!this.presenter.isHydrating())
        window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }
  // #endregion
}
