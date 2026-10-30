// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  AnimateDirective,
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardFooterComponent,
  CardHeaderComponent,
  EmptyStateComponent,
  IconNameDirective,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  SelectComponent,
  SelectItemComponent,
  TooltipDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { SkillsViewPresenter } from '../view-presenters/SkillsViewPresenter';
import { BooleanVariantPipe, PageToolbarComponent } from '@symphony/frontend-ui';

// #endregion

@Component({
  selector: 'symphony-skills-view',
  host: { class: 'flex h-full min-h-0 w-full flex-1 flex-col overflow-hidden' },
  imports: [
    AnimateDirective,
    BadgeComponent,
    BooleanVariantPipe,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardFooterComponent,
    CardHeaderComponent,
    EmptyStateComponent,
    IconNameDirective,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    PageToolbarComponent,
    SelectComponent,
    SelectItemComponent,
    TooltipDirective,
  ],
  providers: [SkillsViewPresenter],
  templateUrl: './SkillsView.html',
  styleUrl: './SkillsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillsView {
  // #region Fields

  protected readonly presenter = inject(SkillsViewPresenter);

  // #endregion
}
