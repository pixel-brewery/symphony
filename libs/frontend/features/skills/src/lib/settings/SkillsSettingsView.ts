// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  AvatarComponent,
  BadgeComponent,
  ButtonComponent,
  IconComponent,
  IconNameDirective,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { BooleanVariantPipe, PseudoLinkDirective } from '@symphony/frontend-ui';
import { AddedLineCountPipe } from '../pipes/AddedLineCountPipe';
import { SkillFlowOptionLabelsPipe } from '../pipes/SkillFlowOptionLabelsPipe';
import { SkillSourceLabelPipe } from '../pipes/SkillSourceLabelPipe';
import { SkillsSettingsViewPresenter } from './SkillsSettingsViewPresenter';

// #endregion

/**
 * The `Skills` section of the Settings window: how each step of the delivery flow works, with the
 * built-in process roles and the attached skill packages of every step.
 *
 * @public
 */
@Component({
  selector: 'symphony-skills-settings-view',
  host: { class: 'block min-w-0' },
  imports: [
    AddedLineCountPipe,
    AvatarComponent,
    BadgeComponent,
    BooleanVariantPipe,
    ButtonComponent,
    IconComponent,
    IconNameDirective,
    PseudoLinkDirective,
    SkillFlowOptionLabelsPipe,
    SkillSourceLabelPipe,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: SkillsSettingsViewPresenter }],
  templateUrl: './SkillsSettingsView.html',
  styleUrl: './SkillsSettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsSettingsView extends View<SkillsSettingsViewPresenter> {}
