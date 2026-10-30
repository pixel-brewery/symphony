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
  HeadlineComponent,
  SelectionAppearancePipe,
  SkillFlowRoleLabelPipe,
} from '@symphony/frontend-ui';
import {
  AvatarComponent,
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  ChoiceComponent,
  ChoiceGroupComponent,
  DismissComponent,
  DrawerContentDirective,
  DrawerFooterDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
  ExpanderComponent,
  HintComponent,
  NumberBoxComponent,
  SelectComponent,
  SelectItemComponent,
  StepperComponent,
  StepperItemComponent,
  StepperNextDirective,
  StepperPrevDirective,
  TextBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
  TypographyDirective,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { SettingNamePipe } from '../pipes/SettingNamePipe';

// #endregion

/** Team-owned agent and position configuration drawer. @public */
@Component({
  selector: 'symphony-team-settings-editor-view',
  host: { class: 'block' },
  imports: [
    AgentFigureComponent,
    AvatarComponent,
    AiAccountStatusPipe,
    AiValidationIssuesLabelPipe,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    ConnectionIconPipe,
    ChoiceComponent,
    ChoiceGroupComponent,
    DismissComponent,
    DrawerContentDirective,
    DrawerFooterDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
    ExpanderComponent,
    HeadlineComponent,
    HintComponent,
    NumberBoxComponent,
    SelectComponent,
    SelectItemComponent,
    SelectionAppearancePipe,
    SettingNamePipe,
    SkillFlowRoleLabelPipe,
    StepperComponent,
    StepperItemComponent,
    StepperNextDirective,
    StepperPrevDirective,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    TypographyDirective,
    IconNameDirective,
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
  /** Retains native drawer rendering after the existing hydration lifecycle. @public */
  public constructor() {
    super();
    effect(() => {
      if (!this.presenter.isHydrating())
        window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }
  // #endregion
}
