// #region Imports

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import {
  AvatarComponent,
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardFooterComponent,
  CardHeaderComponent,
  CellComponent,
  FileBoxComponent,
  HintComponent,
  IconNameDirective,
  NumberBoxComponent,
  SelectComponent,
  SelectItemComponent,
  SliderComponent,
  TextComponent,
  ToggleSwitchComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import {
  HeadlineComponent,
  StorageBreakdownComponent,
  StorageSizePipe,
} from '@symphony/frontend-ui';
import { LocalCiInstanceDetailsPipe } from '../pipes/LocalCiInstanceDetailsPipe';
import { LocalCiInstanceLabelPipe } from '../pipes/LocalCiInstanceLabelPipe';
import { LocalCiPresetDetailsPipe } from '../pipes/LocalCiPresetDetailsPipe';
import { LocalCiPresetLabelPipe } from '../pipes/LocalCiPresetLabelPipe';
import { LocalCiPresetOptionLabelPipe } from '../pipes/LocalCiPresetOptionLabelPipe';
import { CiSettingsViewPresenter } from '../CiSettingsViewPresenter';

// #endregion

/**
 * The host-owned virtual machines: how they are specified, how much disk they may use, and which
 * ones exist right now. Whether a workspace runs GitHub Actions locally is decided per workspace.
 */
@Component({
  selector: 'symphony-virtual-machines-card',
  host: { class: 'block' },
  imports: [
    AvatarComponent,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardFooterComponent,
    CardHeaderComponent,
    CellComponent,
    FileBoxComponent,
    HeadlineComponent,
    HintComponent,
    IconNameDirective,
    LocalCiInstanceDetailsPipe,
    LocalCiInstanceLabelPipe,
    LocalCiPresetDetailsPipe,
    LocalCiPresetLabelPipe,
    LocalCiPresetOptionLabelPipe,
    NumberBoxComponent,
    SelectComponent,
    SelectItemComponent,
    SliderComponent,
    StorageBreakdownComponent,
    StorageSizePipe,
    TextComponent,
    ToggleSwitchComponent,
  ],
  providers: [
    CiSettingsViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: CiSettingsViewPresenter },
  ],
  templateUrl: './VirtualMachinesCardView.html',
  styleUrl: './VirtualMachinesCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualMachinesCardView extends View<CiSettingsViewPresenter> {
  // #region Fields

  private readonly _changeDetector = inject(ChangeDetectorRef);

  // #endregion

  // #region Ctor

  public constructor() {
    super();
    window.requestAnimationFrame(() => this._changeDetector.detectChanges());
  }

  // #endregion
}
