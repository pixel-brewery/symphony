// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {
  BusyStateComponent,
  ButtonComponent,
  MessageComponent,
  TabStripComponent,
  TabStripItemComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core/mobile';
import { MobilePresenterViewPresenter } from '../view-presenters/MobilePresenterViewPresenter';

// #endregion

@Component({
  selector: 'symphony-mobile-presenter-view',
  host: { class: 'block' },
  imports: [
    BusyStateComponent,
    ButtonComponent,
    MessageComponent,
    RouterOutlet,
    TabStripComponent,
    TabStripItemComponent,
    TextComponent,
    TypographyDirective,
  ],
  providers: [
    MobilePresenterViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: MobilePresenterViewPresenter },
  ],
  templateUrl: './MobilePresenterView.html',
  styleUrl: './MobilePresenterView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MobilePresenterView extends View<MobilePresenterViewPresenter> {}
