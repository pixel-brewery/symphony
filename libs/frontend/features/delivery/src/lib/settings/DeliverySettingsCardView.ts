// #region Imports

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import {
  AvatarComponent,
  BadgeComponent,
  ButtonComponent,
  SelectComponent,
  SelectItemComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import {
  SettingsConditionalComponent,
  SettingsGroupComponent,
  SettingsRowComponent,
} from '@symphony/frontend-setting';
import { DeliverySettingsViewPresenter } from './DeliverySettingsViewPresenter';

// #endregion

/** The workspace's `Repositories` and `Delivery destinations` sections. @public */
@Component({
  selector: 'symphony-delivery-settings-card-view',
  host: { class: 'block' },
  imports: [
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    SelectComponent,
    SelectItemComponent,
    SettingsConditionalComponent,
    SettingsGroupComponent,
    SettingsRowComponent,
    TextComponent,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: DeliverySettingsViewPresenter }],
  templateUrl: './DeliverySettingsCardView.html',
  styleUrl: './DeliverySettingsCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliverySettingsCardView extends View<DeliverySettingsViewPresenter> {
  // #region Fields
  private readonly _changeDetector = inject(ChangeDetectorRef);
  // #endregion
  // #region Ctor
  /** Preserves the original native card render scheduling when its projection changes. @public */
  public constructor() {
    super();
    effect(() => {
      this.presenter.workspace();
      this.presenter.workspaceRepositories();
      this.presenter.deliveryTargets();
      window.requestAnimationFrame(() => this._changeDetector.detectChanges());
    });
  }
  // #endregion
}
