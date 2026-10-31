// #region Imports

import { AsyncPipe } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  AvatarComponent,
  ButtonComponent,
  ColorPickerComponent,
  ColorSwatchComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  EmojiComponent,
  FormFieldComponent,
  IconNameDirective,
  MessageComponent,
  SearchBoxComponent,
  SegmentComponent,
  SegmentItemComponent,
  TextBoxComponent,
  TextComponent,
  ToggleButtonComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { mosaikEventText } from '@symphony/frontend-setting';
import { WorkspaceAvatarSourcePipe } from '@symphony/frontend-ui';
import { WorkspaceAvatarDialogViewPresenter } from './WorkspaceAvatarDialogViewPresenter';
import { WorkspaceAvatarIconsPipe } from './WorkspaceAvatarIconsPipe';

// #endregion

/**
 * Workspace-owned icon, emoji and monogram dialog using the FLAMOX365 composition.
 *
 * @public
 */
@Component({
  selector: 'symphony-workspace-avatar-dialog-view',
  host: { class: 'block' },
  templateUrl: './WorkspaceAvatarDialogView.html',
  styleUrl: './WorkspaceAvatarDialogView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  providers: [{ provide: VIEW_PRESENTER, useClass: WorkspaceAvatarDialogViewPresenter }],
  imports: [
    AsyncPipe,
    AvatarComponent,
    ButtonComponent,
    ColorPickerComponent,
    ColorSwatchComponent,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    EmojiComponent,
    FormFieldComponent,
    IconNameDirective,
    MessageComponent,
    SearchBoxComponent,
    SegmentComponent,
    SegmentItemComponent,
    TextBoxComponent,
    TextComponent,
    ToggleButtonComponent,
    WorkspaceAvatarIconsPipe,
    WorkspaceAvatarSourcePipe,
  ],
})
export class WorkspaceAvatarDialogView extends View<WorkspaceAvatarDialogViewPresenter> {
  // #region Fields

  /** Native textbox parsing belongs to the owning View. @protected @readonly */
  protected readonly eventText = (event: unknown): string => mosaikEventText(event) ?? '';

  // #endregion
}
