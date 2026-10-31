// #region Imports

import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  ButtonComponent,
  DotComponent,
  DropDownButtonComponent,
  EmptyStateComponent,
  IconNameDirective,
  MenuComponent,
  MenuItemComponent,
  SkeletonComponent,
  SplitComponent,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  PaneSizeDirective,
  View,
  VIEW_PRESENTER,
  WindowToolbarDirective,
  WorkspaceScopePresenter,
} from '@symphony/frontend-core';
import { RelativeTimePipe } from '@symphony/frontend-ui';
import { WorkflowHealthPresentationPipe } from '../../pipes/WorkflowHealthPresentationPipe';
import { ActionsViewPresenter } from '../view-presenters/ActionsViewPresenter';
import { ActionsAllRunsView } from './ActionsAllRunsView';
import { ActionsWorkflowView } from './ActionsWorkflowView';

// #endregion

/**
 * The `Actions` screen: the `All runs` entry and the `WORKFLOWS` list on the left, and either the
 * overview of every run or the selected workflow on the right.
 *
 * @public
 */
@Component({
  selector: 'symphony-actions-view',
  host: { class: 'flex min-h-0 min-w-0 flex-1' },
  imports: [
    ActionsAllRunsView,
    ActionsWorkflowView,
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ButtonComponent,
    DatePipe,
    DotComponent,
    DropDownButtonComponent,
    EmptyStateComponent,
    IconNameDirective,
    MenuComponent,
    MenuItemComponent,
    PaneSizeDirective,
    RelativeTimePipe,
    SkeletonComponent,
    SplitComponent,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
    WindowToolbarDirective,
    WorkflowHealthPresentationPipe,
  ],
  providers: [
    WorkspaceScopePresenter,
    ActionsViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: ActionsViewPresenter },
  ],
  templateUrl: './ActionsView.html',
  styleUrl: './ActionsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActionsView extends View<ActionsViewPresenter> {}
