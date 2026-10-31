// #region Imports

import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { DatePipe } from '@angular/common';
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
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { OrbitCanvasComponent } from '@symphony/frontend-ui';
import { OrbitViewPresenter } from '../view-presenters/OrbitViewPresenter';

// #endregion

/** Production and delivery share the existing Board ticket selection and filters. */
@Component({
  selector: 'symphony-orbit-view',
  host: {
    class: 'flex h-full min-h-0 w-full flex-1 flex-col',
    '(keydown.escape)': 'presenter.dismissOverlayCommand.execute()',
  },
  imports: [
    FormsModule,
    DatePipe,
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
    OrbitCanvasComponent,
  ],
  providers: [OrbitViewPresenter, { provide: VIEW_PRESENTER, useExisting: OrbitViewPresenter }],
  templateUrl: './OrbitView.html',
  styleUrl: './OrbitView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrbitView extends View<OrbitViewPresenter> {
  // #region Fields

  private readonly _orbitCanvas = viewChild(OrbitCanvasComponent);

  // #endregion

  // #region Methods

  /** Fits the active scene to its actual viewport. @public */
  public fit(): void {
    this._orbitCanvas()?.fit();
  }

  /** Changes the camera distance without changing domain positions. @public */
  public zoomBy(factor: number): void {
    this._orbitCanvas()?.zoomBy(factor);
  }

  // #endregion
}
