// #region Imports

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  AnchorComponent,
  BadgeComponent,
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  DividerComponent,
  DropDownButtonComponent,
  EmptyStateComponent,
  IconComponent,
  IconNameDirective,
  MenuComponent,
  MenuItemComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  PagePreContentComponent,
  ProgressRingComponent,
  SkeletonComponent,
  TimeAgoPipe,
  TooltipDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  CommandDirective,
  View,
  VIEW_PRESENTER,
  WorkspaceScopePresenter,
} from '@symphony/frontend-core';
import {
  BooleanVariantPipe,
  CiRunStatusLabelPipe,
  CiRunStatusVariantPipe,
  CollectionListComponent,
  CollectionListEmptyDirective,
  CollectionListItemDirective,
  CollectionListLoadingItemDirective,
  HoverRevealForDirective,
  PageToolbarComponent,
} from '@symphony/frontend-ui';
import { PullRequestsViewPresenter } from '../view-presenters/PullRequestsViewPresenter';

// #endregion

@Component({
  selector: 'symphony-pull-requests-view',
  host: { class: 'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden' },
  imports: [
    AnchorComponent,
    BadgeComponent,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    BooleanVariantPipe,
    ButtonComponent,
    CiRunStatusLabelPipe,
    CiRunStatusVariantPipe,
    CollectionListComponent,
    CollectionListEmptyDirective,
    CollectionListItemDirective,
    CollectionListLoadingItemDirective,
    CommandDirective,
    DatePipe,
    DividerComponent,
    DropDownButtonComponent,
    EmptyStateComponent,
    HoverRevealForDirective,
    IconComponent,
    IconNameDirective,
    MenuComponent,
    MenuItemComponent,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    PagePreContentComponent,
    PageToolbarComponent,
    ProgressRingComponent,
    SkeletonComponent,
    TimeAgoPipe,
    TooltipDirective,
  ],
  providers: [
    WorkspaceScopePresenter,
    PullRequestsViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: PullRequestsViewPresenter },
  ],
  templateUrl: './PullRequestsView.html',
  styleUrl: './PullRequestsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PullRequestsView extends View<PullRequestsViewPresenter> {}
