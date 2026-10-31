// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  CardFooterComponent,
  CardHeaderComponent,
  DrawerContentDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
  DismissComponent,
  EmptyStateComponent,
  IconNameDirective,
  SearchBoxComponent,
  SelectComponent,
  SelectItemComponent,
  SkeletonComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SkillCatalogDialogViewPresenter } from '../../view-presenters/SkillCatalogDialogViewPresenter';

// #endregion

@Component({
  selector: 'symphony-skill-catalog-dialog-view',
  host: { class: 'block' },
  imports: [
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    CardFooterComponent,
    CardHeaderComponent,
    DrawerContentDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
    DismissComponent,
    EmptyStateComponent,
    IconNameDirective,
    SearchBoxComponent,
    SelectComponent,
    SelectItemComponent,
    SkeletonComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: SkillCatalogDialogViewPresenter }],
  templateUrl: './SkillCatalogDialogView.html',
  styleUrl: './SkillCatalogDialogView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillCatalogDialogView extends View<SkillCatalogDialogViewPresenter> {}
