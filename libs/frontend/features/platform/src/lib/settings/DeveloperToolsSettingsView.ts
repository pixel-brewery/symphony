// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import {
  AvatarComponent,
  ButtonComponent,
  IconNameDirective,
  MessageComponent,
  SkeletonComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  SettingsConditionalComponent,
  SettingsGroupComponent,
  SettingsRowComponent,
} from '@symphony/frontend-setting';
import { RuntimeDependencyDetailsPipe } from '../pipes/RuntimeDependencyDetailsPipe';
import { RuntimeDependencyIconPipe } from '../pipes/RuntimeDependencyIconPipe';
import { RuntimeDependencyLabelPipe } from '../pipes/RuntimeDependencyLabelPipe';
import { DeveloperToolsSettingsViewPresenter } from './DeveloperToolsSettingsViewPresenter';

// #endregion

/**
 * System › `Developer tools`: the local CLIs with their state and one-click Homebrew installs.
 *
 * @public
 */
@Component({
  selector: 'symphony-developer-tools-settings',
  host: { class: 'flex min-w-0 flex-col gap-2' },
  imports: [
    AvatarComponent,
    ButtonComponent,
    IconNameDirective,
    MessageComponent,
    RuntimeDependencyDetailsPipe,
    RuntimeDependencyIconPipe,
    RuntimeDependencyLabelPipe,
    SettingsConditionalComponent,
    SettingsGroupComponent,
    SettingsRowComponent,
    SkeletonComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: DeveloperToolsSettingsViewPresenter }],
  templateUrl: './DeveloperToolsSettingsView.html',
  styleUrl: './DeveloperToolsSettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeveloperToolsSettingsView extends View<DeveloperToolsSettingsViewPresenter> {}
