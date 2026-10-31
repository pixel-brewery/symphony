// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AvatarComponent, ButtonComponent } from '@pixel-brewery/mosaik-elements-angular';
import { SettingsGroupComponent, SettingsRowComponent } from '@symphony/frontend-setting';
import { FeedbackSettingsViewPresenter } from './FeedbackSettingsViewPresenter';

// #endregion

/** Contents-only contribution to the existing Connected services card. @public */
@Component({
  selector: 'symphony-feedback-settings-view',
  host: { class: 'contents' },
  imports: [AvatarComponent, ButtonComponent, SettingsGroupComponent, SettingsRowComponent],
  providers: [FeedbackSettingsViewPresenter],
  templateUrl: './FeedbackSettingsView.html',
  styleUrl: './FeedbackSettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FeedbackSettingsView {
  // #region Fields

  /** The isolated intake projection and editor command. @protected @readonly */
  protected readonly presenter = inject(FeedbackSettingsViewPresenter);

  // #endregion
}
