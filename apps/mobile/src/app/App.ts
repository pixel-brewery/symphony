// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

// #endregion

@Component({
  imports: [RouterOutlet],
  selector: 'symphony-mobile-root',
  templateUrl: './App.html',
  styleUrl: './App.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class App {}
