// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ButtonComponent,
  IconNameDirective,
  TooltipDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SkillsSettingsHeaderActionViewPresenter } from './SkillsSettingsHeaderActionViewPresenter';

// #endregion

/**
 * The `Skills` section's actions in the Settings window toolbar.
 *
 * @public
 */
@Component({
  selector: 'symphony-skills-settings-header-action',
  host: { class: 'contents' },
  imports: [ButtonComponent, IconNameDirective, TooltipDirective],
  providers: [{ provide: VIEW_PRESENTER, useClass: SkillsSettingsHeaderActionViewPresenter }],
  templateUrl: './SkillsSettingsHeaderActionView.html',
  styleUrl: './SkillsSettingsHeaderActionView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsSettingsHeaderActionView extends View<SkillsSettingsHeaderActionViewPresenter> {}
