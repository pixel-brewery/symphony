// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  AvatarComponent,
  BadgeComponent,
  ButtonComponent,
  CardComponent,
  DialogContentDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  DismissComponent,
  IconNameDirective,
  SearchBoxComponent,
  SelectComponent,
  SelectItemComponent,
  SkeletonComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SkillSourceLabelPipe } from '../../pipes/SkillSourceLabelPipe';
import { SkillCatalogDialogViewPresenter } from '../../view-presenters/SkillCatalogDialogViewPresenter';

// #endregion

/**
 * The `Add skills` sheet: discovered skill packages that are not active yet, each with the flow
 * step it should run in.
 *
 * @public
 */
@Component({
  selector: 'symphony-skill-catalog-dialog-view',
  host: { class: 'block' },
  imports: [
    AvatarComponent,
    BadgeComponent,
    ButtonComponent,
    CardComponent,
    DialogContentDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    DismissComponent,
    IconNameDirective,
    SearchBoxComponent,
    SelectComponent,
    SelectItemComponent,
    SkeletonComponent,
    SkillSourceLabelPipe,
    TextComponent,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: SkillCatalogDialogViewPresenter }],
  templateUrl: './SkillCatalogDialogView.html',
  styleUrl: './SkillCatalogDialogView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillCatalogDialogView extends View<SkillCatalogDialogViewPresenter> {}
