// #region Imports

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import {
  AvatarComponent,
  ButtonComponent,
  IconNameDirective,
  MessageComponent,
  SelectComponent,
  SelectItemComponent,
  SliderComponent,
  TextComponent,
  ToggleSwitchComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import {
  SettingsConditionalComponent,
  SettingsGroupComponent,
  SettingsRowComponent,
} from '@symphony/frontend-setting';
import { StorageSizePipe } from '@symphony/frontend-ui';
import type { ILocalCiResourceLimits } from '@symphony/domain-ci';
import { LocalCiInstanceDetailsPipe } from '../pipes/LocalCiInstanceDetailsPipe';
import { LocalCiInstanceLabelPipe } from '../pipes/LocalCiInstanceLabelPipe';
import { LocalCiPresetDetailsPipe } from '../pipes/LocalCiPresetDetailsPipe';
import { LocalCiPresetOptionLabelPipe } from '../pipes/LocalCiPresetOptionLabelPipe';
import { CiSettingsViewPresenter } from '../CiSettingsViewPresenter';
import { VirtualMachinesCardViewPresenter } from '../VirtualMachinesCardViewPresenter';

// #endregion

/**
 * The host-owned virtual machines: how they are specified, how much disk they may use, and which
 * ones exist right now. Whether a workspace runs GitHub Actions locally is decided per workspace.
 */
@Component({
  selector: 'symphony-virtual-machines-card',
  host: { class: 'flex min-w-0 flex-col gap-2' },
  imports: [
    AvatarComponent,
    ButtonComponent,
    IconNameDirective,
    LocalCiInstanceDetailsPipe,
    LocalCiInstanceLabelPipe,
    LocalCiPresetDetailsPipe,
    LocalCiPresetOptionLabelPipe,
    MessageComponent,
    SelectComponent,
    SelectItemComponent,
    SettingsConditionalComponent,
    SettingsGroupComponent,
    SettingsRowComponent,
    SliderComponent,
    StorageSizePipe,
    TextComponent,
    ToggleSwitchComponent,
    TypographyDirective,
  ],
  providers: [
    CiSettingsViewPresenter,
    VirtualMachinesCardViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: VirtualMachinesCardViewPresenter },
  ],
  templateUrl: './VirtualMachinesCardView.html',
  styleUrl: './VirtualMachinesCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VirtualMachinesCardView extends View<VirtualMachinesCardViewPresenter> {
  // #region Fields

  private readonly _changeDetector = inject(ChangeDetectorRef);

  /**
   * The resource presets in menu order.
   *
   * @protected
   * @readonly
   */
  protected readonly presets = ['compact', 'balanced', 'performance', 'custom'] as const;

  /**
   * The custom resources with their sliders.
   *
   * @protected
   * @readonly
   */
  protected readonly customResources: readonly {
    readonly key: keyof ILocalCiResourceLimits;
    readonly testId: string;
    readonly label: string;
    readonly unit: string;
    readonly minimum: number;
  }[] = [
    { key: 'cpus', testId: 'cpus', label: 'CPUs', unit: ' CPUs', minimum: 2 },
    { key: 'memoryGiB', testId: 'memory', label: 'Memory', unit: ' GB', minimum: 8 },
    { key: 'diskGiB', testId: 'disk', label: 'Virtual disk', unit: ' GB', minimum: 8 },
    { key: 'cacheGiB', testId: 'cache', label: 'Shared cache', unit: ' GB', minimum: 1 },
  ];

  // #endregion

  // #region Ctor

  public constructor() {
    super();
    window.requestAnimationFrame(() => this._changeDetector.detectChanges());
  }

  // #endregion
}
