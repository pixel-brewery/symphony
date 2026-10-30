// #region Imports

import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ShellViewPresenter } from '../view-presenters/ShellViewPresenter';

// #endregion

@Component({
  selector: 'symphony-shell',
  host: { class: 'block' },
  imports: [RouterOutlet],
  providers: [ShellViewPresenter],
  templateUrl: './ShellView.html',
  styleUrl: './ShellView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellView {
  // #region Fields

  protected readonly presenter = inject(ShellViewPresenter);

  // #endregion

  // #region Ctor

  public constructor() {
    const router = inject(Router);
    const destroyRef = inject(DestroyRef);
    const unsubscribe = window.desktop.onNavigate((path) => void router.navigateByUrl(path));
    destroyRef.onDestroy(unsubscribe);
  }

  // #endregion
}
