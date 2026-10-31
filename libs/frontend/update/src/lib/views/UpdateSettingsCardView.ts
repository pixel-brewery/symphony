// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  CardComponent,
  CardContentComponent,
  CardFooterComponent,
  CardHeaderComponent,
  SelectComponent,
  SelectItemComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { HeadlineComponent } from '@symphony/frontend-ui';
import { UpdateSettingsCardViewPresenter } from '../view-presenters/UpdateSettingsCardViewPresenter';
import { UpdateActionsView } from './UpdateActionsView';
import { UpdateStatusView } from './UpdateStatusView';

// #endregion

/**
 * The existing Updates settings card, owned by the update capability.
 *
 * @public
 */
@Component({
  selector: 'symphony-update-settings-card',
  host: { class: 'block' },
  imports: [
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    CardComponent,
    CardContentComponent,
    CardFooterComponent,
    CardHeaderComponent,
    HeadlineComponent,
    SelectComponent,
    SelectItemComponent,
    UpdateActionsView,
    UpdateStatusView,
  ],
  providers: [
    UpdateSettingsCardViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: UpdateSettingsCardViewPresenter },
  ],
  templateUrl: './UpdateSettingsCardView.html',
  styleUrl: './UpdateSettingsCardView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateSettingsCardView extends View<UpdateSettingsCardViewPresenter> {}
