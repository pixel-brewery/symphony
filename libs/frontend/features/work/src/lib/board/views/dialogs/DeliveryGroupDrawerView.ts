// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  CellComponent,
  CellGroupComponent,
  DismissComponent,
  DividerComponent,
  DrawerContentDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
  TextComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { DeliveryGroupDrawerViewPresenter } from '../../view-presenters/DeliveryGroupDrawerViewPresenter';

// #endregion

@Component({
  selector: 'symphony-delivery-group-drawer-view',
  host: { class: 'block' },
  imports: [
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CellComponent,
    CellGroupComponent,
    DismissComponent,
    DividerComponent,
    DrawerContentDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
    TextComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: DeliveryGroupDrawerViewPresenter }],
  templateUrl: './DeliveryGroupDrawerView.html',
  styleUrl: './DeliveryGroupDrawerView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryGroupDrawerView extends View<DeliveryGroupDrawerViewPresenter> {}
