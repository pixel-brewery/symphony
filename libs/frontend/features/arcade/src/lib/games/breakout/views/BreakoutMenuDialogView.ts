// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormField } from '@angular/forms/signals';
import {
  ButtonComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  FormFieldComponent,
  FormFieldStateDirective,
  IconNameDirective,
  KBD_DEFAULT_PROPS,
  KbdComponent,
  SelectComponent,
  SelectItemComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { CommandDirective, View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { BreakoutMenuDialogViewPresenter } from './BreakoutMenuDialogViewPresenter';

// #endregion

/** Mosaik-hosted setup and instruction dialog for Breakout. @public */
@Component({
  selector: 'symphony-breakout-menu-dialog-view',
  imports: [
    ButtonComponent,
    CommandDirective,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    FormField,
    FormFieldComponent,
    FormFieldStateDirective,
    IconNameDirective,
    KbdComponent,
    SelectComponent,
    SelectItemComponent,
    TextComponent,
    TypographyDirective,
  ],
  providers: [
    { provide: KBD_DEFAULT_PROPS, useValue: { value: [] } },
    { provide: VIEW_PRESENTER, useClass: BreakoutMenuDialogViewPresenter },
  ],
  templateUrl: './BreakoutMenuDialogView.html',
  styleUrl: './BreakoutMenuDialogView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BreakoutMenuDialogView extends View<BreakoutMenuDialogViewPresenter> {}
