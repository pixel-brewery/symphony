// #region Imports

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ButtonComponent,
  CodeComponent,
  IconComponent,
  IconNameDirective,
  NumberBoxComponent,
  SegmentComponent,
  SegmentItemComponent,
  TextComponent,
  ToggleSwitchComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SettingsGroupComponent, SettingsRowComponent } from '@symphony/frontend-setting';
import { AgenticSwitchLabelPipe } from '../pipes/AgenticSwitchLabelPipe';
import { AutomationPolicySettingsViewPresenter } from './AutomationPolicySettingsViewPresenter';

// #endregion

/**
 * The `Automation` section of the Settings window: how far the AI team may work on its own, in
 * every workspace.
 *
 * @public
 */
@Component({
  selector: 'symphony-automation-policy-settings',
  host: { class: 'block min-w-0' },
  imports: [
    AgenticSwitchLabelPipe,
    ButtonComponent,
    CodeComponent,
    IconComponent,
    IconNameDirective,
    NgTemplateOutlet,
    NumberBoxComponent,
    SegmentComponent,
    SegmentItemComponent,
    SettingsGroupComponent,
    SettingsRowComponent,
    TextComponent,
    ToggleSwitchComponent,
    TooltipDirective,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: AutomationPolicySettingsViewPresenter }],
  templateUrl: './AutomationPolicySettingsView.html',
  styleUrl: './AutomationPolicySettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AutomationPolicySettingsView extends View<AutomationPolicySettingsViewPresenter> {}
