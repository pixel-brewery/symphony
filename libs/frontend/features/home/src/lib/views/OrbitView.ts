// #region Imports

import { ChangeDetectionStrategy, Component, viewChild } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import {
  ButtonComponent,
  CardComponent,
  DividerComponent,
  DropDownButtonComponent,
  HintComponent,
  MenuComponent,
  MenuItemComponent,
  ProgressBarComponent,
  SelectComponent,
  SelectItemComponent,
  SplitComponent,
  TextBoxComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import {
  PaneSizeDirective,
  View,
  VIEW_PRESENTER,
  WindowToolbarDirective,
} from '@symphony/frontend-core';
import { OrbitCanvasComponent } from '@symphony/frontend-ui';
import { OrbitViewPresenter } from '../view-presenters/OrbitViewPresenter';

// #endregion

/**
 * The release orbit: the destination with its stage clusters, zoom controls, and an inspector for
 * the selected cluster, destination or work item. Selection and filters are shared with the Board.
 *
 * @public
 */
@Component({
  selector: 'symphony-orbit-view',
  host: {
    class: 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden',
    '(keydown.escape)': 'presenter.dismissOverlayCommand.execute()',
  },
  imports: [
    ButtonComponent,
    CardComponent,
    DatePipe,
    DecimalPipe,
    DividerComponent,
    DropDownButtonComponent,
    FormsModule,
    HintComponent,
    MenuComponent,
    MenuItemComponent,
    OrbitCanvasComponent,
    PaneSizeDirective,
    ProgressBarComponent,
    RouterLink,
    SelectComponent,
    SelectItemComponent,
    SplitComponent,
    TextBoxComponent,
    TextComponent,
    TypographyDirective,
    WindowToolbarDirective,
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

  /** Returns to a scale of the fitted view (1 is 100 %) along the current direction. @public */
  public zoomTo(scale: number): void {
    this._orbitCanvas()?.zoomTo(scale);
  }

  // #endregion
}
