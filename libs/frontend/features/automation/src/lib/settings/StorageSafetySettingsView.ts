// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import {
  AvatarComponent,
  ButtonComponent,
  IconNameDirective,
  MessageComponent,
  NumberBoxComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  SettingsConditionalComponent,
  SettingsGroupComponent,
  SettingsRowComponent,
} from '@symphony/frontend-setting';
import { StorageBreakdownComponent, StorageSizePipe } from '@symphony/frontend-ui';
import { StorageShareSummaryPipe } from '../pipes/StorageShareSummaryPipe';
import { StorageSafetySettingsViewPresenter } from './StorageSafetySettingsViewPresenter';

// #endregion

/**
 * System › `Storage`: the single storage picture of this Mac with its hard limits.
 *
 * @public
 */
@Component({
  selector: 'symphony-storage-safety-settings',
  host: { class: 'flex min-w-0 flex-col gap-2' },
  imports: [
    AvatarComponent,
    ButtonComponent,
    IconNameDirective,
    MessageComponent,
    NumberBoxComponent,
    SettingsConditionalComponent,
    SettingsGroupComponent,
    SettingsRowComponent,
    StorageBreakdownComponent,
    StorageShareSummaryPipe,
    StorageSizePipe,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: StorageSafetySettingsViewPresenter }],
  templateUrl: './StorageSafetySettingsView.html',
  styleUrl: './StorageSafetySettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageSafetySettingsView extends View<StorageSafetySettingsViewPresenter> {}
