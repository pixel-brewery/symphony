// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WidgetCategoryView } from '@symphony/frontend-widget';

// #endregion

/** The delivery feature's existing Home category view contribution. @public */
@Component({
  selector: 'symphony-delivery-home-widget',
  host: { class: 'contents' },
  imports: [WidgetCategoryView],
  templateUrl: './DeliveryHomeWidgetView.html',
  styleUrl: './DeliveryHomeWidgetView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeliveryHomeWidgetView {}
