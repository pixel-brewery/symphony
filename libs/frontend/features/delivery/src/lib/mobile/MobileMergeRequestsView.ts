// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  BadgeComponent,
  CardComponent,
  CardContentComponent,
  CardHeaderComponent,
  EmptyStateComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  PagePreContentComponent,
  SearchBoxComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core/mobile';
import { PseudoLinkDirective } from '@symphony/frontend-ui/mobile';
import { MobileMergeRequestsViewPresenter } from './MobileMergeRequestsViewPresenter';
import { MergeRequestStateVariantPipe } from '../pipes/MergeRequestStateVariantPipe';

// #endregion

@Component({
  selector: 'symphony-mobile-merge-requests-view',
  host: { class: 'block' },
  imports: [
    BadgeComponent,
    CardComponent,
    CardContentComponent,
    CardHeaderComponent,
    EmptyStateComponent,
    MergeRequestStateVariantPipe,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    PagePreContentComponent,
    PseudoLinkDirective,
    SearchBoxComponent,
  ],
  providers: [
    MobileMergeRequestsViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: MobileMergeRequestsViewPresenter },
  ],
  templateUrl: './MobileMergeRequestsView.html',
  styleUrl: './MobileMergeRequestsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileMergeRequestsView extends View<MobileMergeRequestsViewPresenter> {}
