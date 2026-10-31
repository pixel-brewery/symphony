// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  BadgeComponent,
  ButtonComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  DismissComponent,
  DividerComponent,
  FileBoxComponent,
  IconNameDirective,
  SelectComponent,
  SelectItemComponent,
  TextBoxComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SkillEditorDialogViewPresenter } from '../../view-presenters/SkillEditorDialogViewPresenter';

// #endregion

/**
 * The skill package sheet: `New skill` and `Skill details`.
 *
 * @public
 */
@Component({
  selector: 'symphony-skill-editor-dialog-view',
  host: { class: 'block' },
  imports: [
    BadgeComponent,
    ButtonComponent,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    DismissComponent,
    DividerComponent,
    FileBoxComponent,
    IconNameDirective,
    SelectComponent,
    SelectItemComponent,
    TextBoxComponent,
    TextComponent,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: SkillEditorDialogViewPresenter }],
  templateUrl: './SkillEditorDialogView.html',
  styleUrl: './SkillEditorDialogView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillEditorDialogView extends View<SkillEditorDialogViewPresenter> {}
