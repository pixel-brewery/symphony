// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WidgetCategoryView } from '@symphony/frontend-widget';

// #endregion

/** The work feature's existing Home category view contribution. @public */
@Component({
  selector: 'symphony-work-home-widget',
  host: { class: 'contents' },
  imports: [WidgetCategoryView],
  templateUrl: './WorkHomeWidgetView.html',
  styleUrl: './WorkHomeWidgetView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkHomeWidgetView {}
