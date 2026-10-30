// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ImageComponent,
  IconComponent,
  TileComponent,
  PageComponent,
  PageContentComponent,
  PageHeaderComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { CommandDirective, View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { ArcadeViewPresenter } from '../view-presenters/ArcadeViewPresenter';

// #endregion

/** Presents the available games without starting an expedition. @public */
@Component({
  selector: 'symphony-arcade-view',
  host: { class: 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden' },
  imports: [
    CommandDirective,
    ImageComponent,
    IconComponent,
    TileComponent,
    PageComponent,
    PageContentComponent,
    PageHeaderComponent,
    TextComponent,
    TypographyDirective,
  ],
  providers: [ArcadeViewPresenter, { provide: VIEW_PRESENTER, useExisting: ArcadeViewPresenter }],
  templateUrl: './ArcadeView.html',
  styleUrl: './ArcadeView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArcadeView extends View<ArcadeViewPresenter> {}
