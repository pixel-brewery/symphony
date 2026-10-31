// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  BadgeComponent,
  ButtonComponent,
  DismissComponent,
  DrawerContentDirective,
  DrawerFooterDirective,
  DrawerHeaderComponent,
  DrawerHeaderDirective,
  FileBoxComponent,
  IconNameDirective,
  SelectComponent,
  SelectItemComponent,
  TextBoxComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SkillEditorDrawerViewPresenter } from '../../view-presenters/SkillEditorDrawerViewPresenter';

// #endregion

@Component({
  selector: 'symphony-skill-editor-drawer-view',
  host: { class: 'block' },
  imports: [
    BadgeComponent,
    ButtonComponent,
    DrawerContentDirective,
    DrawerFooterDirective,
    DrawerHeaderComponent,
    DrawerHeaderDirective,
    DismissComponent,
    FileBoxComponent,
    IconNameDirective,
    SelectComponent,
    SelectItemComponent,
    TextBoxComponent,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: SkillEditorDrawerViewPresenter }],
  templateUrl: './SkillEditorDrawerView.html',
  styleUrl: './SkillEditorDrawerView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SkillEditorDrawerView extends View<SkillEditorDrawerViewPresenter> {}
