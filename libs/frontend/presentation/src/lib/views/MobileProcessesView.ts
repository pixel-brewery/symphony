// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  EmptyStateComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  ProgressRingComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core/mobile';
import { MobileProcessesViewPresenter } from '../view-presenters/MobileProcessesViewPresenter';

// #endregion

@Component({
  selector: 'symphony-mobile-processes-view',
  host: { class: 'block' },
  imports: [
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    EmptyStateComponent,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    ProgressRingComponent,
  ],
  providers: [
    MobileProcessesViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: MobileProcessesViewPresenter },
  ],
  templateUrl: './MobileProcessesView.html',
  styleUrl: './MobileProcessesView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileProcessesView extends View<MobileProcessesViewPresenter> {}
