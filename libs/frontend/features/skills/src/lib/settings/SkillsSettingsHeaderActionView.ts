// #region Imports
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ButtonComponent } from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SkillsSettingsHeaderActionViewPresenter } from './SkillsSettingsHeaderActionViewPresenter';
// #endregion
/** Feature-owned import action in the Settings host's existing native header slot. @public */
@Component({
  selector: 'symphony-skills-settings-header-action',
  host: { class: 'contents' },
  imports: [ButtonComponent],
  providers: [{ provide: VIEW_PRESENTER, useClass: SkillsSettingsHeaderActionViewPresenter }],
  templateUrl: './SkillsSettingsHeaderActionView.html',
  styleUrl: './SkillsSettingsHeaderActionView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsSettingsHeaderActionView extends View<SkillsSettingsHeaderActionViewPresenter> {}
