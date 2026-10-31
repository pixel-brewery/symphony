// #region Imports

import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject } from '@angular/core';
import { ButtonComponent } from '@pixel-brewery/mosaik-elements-angular';
import { UpdateSettingsCardViewPresenter } from '../view-presenters/UpdateSettingsCardViewPresenter';

// #endregion

@Component({
  selector: 'symphony-update-actions',
  host: { class: 'block' },
  imports: [ButtonComponent],
  templateUrl: './UpdateActionsView.html',
  styleUrl: './UpdateActionsView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UpdateActionsView {
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
