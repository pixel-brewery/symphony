// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CellComponent,
  CellGroupComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  ProgressBarComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core/mobile';
import {
  AgentFigureComponent,
  AgentStateLabelPipe,
  PseudoLinkDirective,
} from '@symphony/frontend-ui/mobile';
import { MobileHomeViewPresenter } from './MobileHomeViewPresenter';
import { MobileDashboardFocusView } from './MobileDashboardFocusView';
import { MobileWorkItemCreateGroupView } from './MobileWorkItemCreateGroupView';
import { MobileDashboardFocusPipe } from '../pipes/MobileDashboardFocusPipe';

// #endregion

@Component({
  selector: 'symphony-mobile-home-view',
  host: { class: 'block' },
  imports: [
    AgentFigureComponent,
    AgentStateLabelPipe,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CellComponent,
    CellGroupComponent,
    MobileDashboardFocusView,
    MobileDashboardFocusPipe,
    MobileWorkItemCreateGroupView,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    ProgressBarComponent,
    PseudoLinkDirective,
    RouterLink,
    TextComponent,
    TypographyDirective,
  ],
  providers: [
    MobileHomeViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: MobileHomeViewPresenter },
  ],
  templateUrl: './MobileHomeView.html',
  styleUrl: './MobileHomeView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobileHomeView extends View<MobileHomeViewPresenter> {}
