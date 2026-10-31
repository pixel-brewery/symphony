// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  DialogContentDirective,
  DialogFooterDirective,
  DialogHeaderComponent,
  DialogHeaderDirective,
  IconNameDirective,
  MessageComponent,
  SelectComponent,
  SelectItemComponent,
  TextBoxComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SettingsConditionalComponent } from '@symphony/frontend-setting';
import { AgentFigureComponent } from '@symphony/frontend-ui';
import { SetupViewPresenter } from '../view-presenters/SetupViewPresenter';

// #endregion

/**
 * `Build your project team`: a sheet of the Settings window that connects a repository, a ticket
 * source and one employee, proposes the configuration and applies it on request.
 *
 * @public
 */
@Component({
  selector: 'symphony-setup-view',
  imports: [
    AgentFigureComponent,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    DialogContentDirective,
    DialogFooterDirective,
    DialogHeaderComponent,
    DialogHeaderDirective,
    FormsModule,
    IconNameDirective,
    MessageComponent,
    SelectComponent,
    SelectItemComponent,
    SettingsConditionalComponent,
    TextBoxComponent,
    TextComponent,
    TypographyDirective,
  ],
  providers: [SetupViewPresenter, { provide: VIEW_PRESENTER, useExisting: SetupViewPresenter }],
  templateUrl: './SetupView.html',
  styleUrl: './SetupView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupView extends View<SetupViewPresenter> {}
