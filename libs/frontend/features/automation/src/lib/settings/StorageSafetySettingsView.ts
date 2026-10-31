// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import {
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardFooterComponent,
  CardHeaderComponent,
  NumberBoxComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  HeadlineComponent,
  StorageBreakdownComponent,
  StorageSizePipe,
} from '@symphony/frontend-ui';
import { StorageSafetySettingsViewPresenter } from './StorageSafetySettingsViewPresenter';

// #endregion

/**
 * Feature-owned Settings card composed by the native host.
 *
 * @public
 */
@Component({
  selector: 'symphony-storage-safety-settings',
  host: { class: 'contents' },
  imports: [
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardFooterComponent,
    CardHeaderComponent,
    NumberBoxComponent,
    HeadlineComponent,
    StorageBreakdownComponent,
    StorageSizePipe,
    IconNameDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: StorageSafetySettingsViewPresenter }],
  templateUrl: './StorageSafetySettingsView.html',
  styleUrl: './StorageSafetySettingsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class StorageSafetySettingsView extends View<StorageSafetySettingsViewPresenter> {}
