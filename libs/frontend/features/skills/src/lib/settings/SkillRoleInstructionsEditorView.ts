// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ButtonComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  DismissComponent,
  SegmentComponent,
  SegmentItemComponent,
  TextBoxComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SkillRoleInstructionsEditorViewPresenter } from './SkillRoleInstructionsEditorViewPresenter';

// #endregion

/**
 * The instructions sheet of a built-in process role, opened from `Edit instructions` in `Skills`.
 *
 * @public
 */
@Component({
  selector: 'symphony-skill-role-instructions-editor-view',
  host: { class: 'block' },
  imports: [
    ButtonComponent,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    DismissComponent,
    SegmentComponent,
    SegmentItemComponent,
    TextBoxComponent,
    TextComponent,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: SkillRoleInstructionsEditorViewPresenter }],
  templateUrl: './SkillRoleInstructionsEditorView.html',
  styleUrl: './SkillRoleInstructionsEditorView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillRoleInstructionsEditorView extends View<SkillRoleInstructionsEditorViewPresenter> {}
