// #region Imports

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { CellComponent } from '@pixel-brewery/mosaik-elements-angular';
import { UpdateSettingsCardViewPresenter } from '../view-presenters/UpdateSettingsCardViewPresenter';
import { UpdateDetailsPipe } from '../pipes/UpdateDetailsPipe';
import { UpdateStatusLabelPipe } from '../pipes/UpdateStatusLabelPipe';

// #endregion

@Component({
  selector: 'symphony-update-status',
  host: { class: 'block' },
  imports: [CellComponent, UpdateDetailsPipe, UpdateStatusLabelPipe],
  templateUrl: './UpdateStatusView.html',
  styleUrl: './UpdateStatusView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateStatusView {
  // #region Fields

  protected readonly presenter = inject(UpdateSettingsCardViewPresenter);
  private readonly _changeDetector = inject(ChangeDetectorRef);

  // #endregion

  // #region Ctor

  public constructor() {
    window.requestAnimationFrame(() => this._changeDetector.detectChanges());
  }

  // #endregion
}
