// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ButtonComponent,
  CardComponent,
  CardContentComponent,
  HintComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  SelectComponent,
  SelectItemComponent,
  TextBoxComponent,
  TextComponent,
  ToggleSwitchComponent,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { AgentFigureComponent } from '@symphony/frontend-ui';
import { SetupViewPresenter } from '../view-presenters/SetupViewPresenter';

// #endregion

/** A reviewable project construction surface. */
@Component({
  selector: 'symphony-setup-view',
  imports: [
    FormsModule,
    RouterLink,
    ButtonComponent,
    CardComponent,
    CardContentComponent,
    HintComponent,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    SelectComponent,
    SelectItemComponent,
    TextBoxComponent,
    TextComponent,
    ToggleSwitchComponent,
    AgentFigureComponent,
  ],
  providers: [SetupViewPresenter, { provide: VIEW_PRESENTER, useExisting: SetupViewPresenter }],
  templateUrl: './SetupView.html',
  styleUrl: './SetupView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SetupView extends View<SetupViewPresenter> {}
