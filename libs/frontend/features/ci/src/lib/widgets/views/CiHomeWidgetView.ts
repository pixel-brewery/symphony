// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { WidgetCategoryView } from '@symphony/frontend-widget';

// #endregion

/** The ci feature's existing Home category view contribution. @public */
@Component({
  selector: 'symphony-ci-home-widget',
  host: { class: 'contents' },
  imports: [WidgetCategoryView],
  templateUrl: './CiHomeWidgetView.html',
  styleUrl: './CiHomeWidgetView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CiHomeWidgetView {}
