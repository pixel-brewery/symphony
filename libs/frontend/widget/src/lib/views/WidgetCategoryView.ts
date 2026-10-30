// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  AnimateDirective,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  HintComponent,
  IconComponent,
  IconNameDirective,
  ProgressRingComponent,
  SkeletonComponent,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { PseudoLinkDirective } from '@symphony/frontend-ui';
import { WidgetCategoryViewPresenter } from '../view-presenters/WidgetCategoryViewPresenter';

// #endregion

/** The existing category mosaic rendered for its owning feature's native view slot. @public */
@Component({
  selector: 'symphony-widget-category',
  host: { class: 'contents' },
  imports: [
    AnimateDirective,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    HintComponent,
    IconComponent,
    IconNameDirective,
    ProgressRingComponent,
    PseudoLinkDirective,
    RouterLink,
    SkeletonComponent,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: WidgetCategoryViewPresenter }],
  templateUrl: './WidgetCategoryView.html',
  styleUrl: './WidgetCategoryView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WidgetCategoryView extends View<WidgetCategoryViewPresenter> {}
