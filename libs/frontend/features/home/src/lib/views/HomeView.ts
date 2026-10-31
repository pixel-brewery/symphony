// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  BannerComponent,
  BannerHeaderComponent,
  BannerSubHeaderComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  ScrollComponent,
  TextComponent,
  TypographyDirective,
  ViewSlotOutletComponent,
  IconNameDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { WidgetHostDirective, WIDGET_VIEW_SLOT } from '@symphony/frontend-widget';
import { GreetingPipe } from '../pipes/GreetingPipe';
import { ExternalServiceIncidentImpactPipe } from '../pipes/ExternalServiceIncidentImpactPipe';
import { HomeViewPresenter } from '../view-presenters/HomeViewPresenter';

// #endregion

@Component({
  selector: 'symphony-home-view',
  host: { class: 'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden' },
  imports: [
    BannerComponent,
    BannerHeaderComponent,
    BannerSubHeaderComponent,
    ExternalServiceIncidentImpactPipe,
    GreetingPipe,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    ScrollComponent,
    TextComponent,
    TypographyDirective,
    ViewSlotOutletComponent,
    WidgetHostDirective,
    IconNameDirective,
  ],
  providers: [HomeViewPresenter, { provide: VIEW_PRESENTER, useExisting: HomeViewPresenter }],
  templateUrl: './HomeView.html',
  styleUrl: './HomeView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomeView extends View<HomeViewPresenter> {
  // #region Fields

  protected readonly now = new Date();
  protected readonly widgetSlot = WIDGET_VIEW_SLOT;

  // #endregion
}
