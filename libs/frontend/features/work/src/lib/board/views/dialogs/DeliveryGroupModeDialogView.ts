// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ButtonComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  RadioComponent,
  RadioGroupComponent,
  TextComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { DeliveryGroupModeDialogViewPresenter } from '../../view-presenters/DeliveryGroupModeDialogViewPresenter';

// #endregion

@Component({
  selector: 'symphony-delivery-group-mode-dialog-view',
  imports: [
    ButtonComponent,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    RadioComponent,
    RadioGroupComponent,
    TextComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: DeliveryGroupModeDialogViewPresenter }],
  templateUrl: './DeliveryGroupModeDialogView.html',
  styleUrl: './DeliveryGroupModeDialogView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryGroupModeDialogView extends View<DeliveryGroupModeDialogViewPresenter> {}
