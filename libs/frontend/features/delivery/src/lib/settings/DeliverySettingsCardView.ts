// #region Imports

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
} from '@angular/core';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import {
  AvatarComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  CellComponent,
  CellGroupComponent,
  SelectComponent,
  SelectItemComponent,
  TextComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { HeadlineComponent } from '@symphony/frontend-ui';
import { DeliverySettingsViewPresenter } from './DeliverySettingsViewPresenter';

// #endregion

/** Preserves the single workspace-card wrapper for the two Delivery-owned sections. @public */
@Component({
  selector: 'symphony-delivery-settings-card-view',
  host: { class: 'block' },
  imports: [
    AvatarComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    CellComponent,
    CellGroupComponent,
    HeadlineComponent,
    SelectComponent,
    SelectItemComponent,
    TextComponent,
    IconNameDirective,
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
