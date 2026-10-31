// #region Imports

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  AvatarComponent,
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
  MessageComponent,
  ProgressRingComponent,
  SkeletonComponent,
  SplitComponent,
  TableBodyCellComponent,
  TableBodyComponent,
  TableBodyRowComponent,
  TableComponent,
  TableHeaderCellComponent,
  TableHeaderComponent,
  TableHeaderRowComponent,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  CommandDirective,
  PaneSizeDirective,
  View,
  VIEW_PRESENTER,
  WindowToolbarDirective,
  WorkspaceScopePresenter,
} from '@symphony/frontend-core';
import {
  CiRunStatusLabelPipe,
  HoverRevealForDirective,
  RelativeTimePipe,
} from '@symphony/frontend-ui';
import { CheckDurationPipe } from '../pipes/CheckDurationPipe';
import { PullRequestCheckIconPipe } from '../pipes/PullRequestCheckIconPipe';
import { PullRequestChecksVariantPipe } from '../pipes/PullRequestChecksVariantPipe';
import { PullRequestMergeStateLabelPipe } from '../pipes/PullRequestMergeStateLabelPipe';
import { PullRequestMergeStateVariantPipe } from '../pipes/PullRequestMergeStateVariantPipe';
import { PullRequestsViewPresenter } from '../view-presenters/PullRequestsViewPresenter';

// #endregion

/**
 * The `Pull requests` screen: a segment and a table of the open pull requests with an inspector of
 * the selected one; the title, the subtitle, the filter menu and the refresh live in the window
 * toolbar.
 *
 * @public
 */
@Component({
  selector: 'symphony-pull-requests-view',
  host: { class: 'flex min-h-0 w-full min-w-0 flex-1 overflow-hidden' },
  imports: [
    AvatarComponent,
    BadgeComponent,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    CheckDurationPipe,
    CiRunStatusLabelPipe,
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
    MessageComponent,
    PaneSizeDirective,
    ProgressRingComponent,
    PullRequestCheckIconPipe,
    PullRequestChecksVariantPipe,
    PullRequestMergeStateLabelPipe,
    PullRequestMergeStateVariantPipe,
    RelativeTimePipe,
    SkeletonComponent,
    SplitComponent,
    TableBodyCellComponent,
    TableBodyComponent,
    TableBodyRowComponent,
    TableComponent,
    TableHeaderCellComponent,
    TableHeaderComponent,
    TableHeaderRowComponent,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
    WindowToolbarDirective,
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
