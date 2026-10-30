// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import {
  AvatarComponent,
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  CellComponent,
  CellGroupComponent,
  SkeletonComponent,
  TextComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { RuntimeDependencyDetailsPipe } from '../pipes/RuntimeDependencyDetailsPipe';
import { RuntimeDependencyIconPipe } from '../pipes/RuntimeDependencyIconPipe';
import { RuntimeDependencyLabelPipe } from '../pipes/RuntimeDependencyLabelPipe';
import { DeveloperToolsSettingsViewPresenter } from './DeveloperToolsSettingsViewPresenter';

// #endregion

/**
 * Feature-owned Settings card composed by the native host.
 *
 * @public
 */
@Component({
  selector: 'symphony-developer-tools-settings',
  host: { class: 'contents' },
  imports: [
    AvatarComponent,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CellComponent,
    CellGroupComponent,
    SkeletonComponent,
    TextComponent,
    RuntimeDependencyDetailsPipe,
    RuntimeDependencyIconPipe,
    RuntimeDependencyLabelPipe,
    IconNameDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: DeveloperToolsSettingsViewPresenter }],
  templateUrl: './DeveloperToolsSettingsView.html',
  styleUrl: './DeveloperToolsSettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeveloperToolsSettingsView extends View<DeveloperToolsSettingsViewPresenter> {}
