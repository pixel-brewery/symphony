// #region Imports

import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AppComponent, THEME } from '@pixel-brewery/mosaik-elements-angular';
import { SettingsView } from './SettingsView';

// #endregion

/**
 * The Settings window: its own sidebar with the workspaces and Symphony sections, a toolbar with
 * the section's name, and the section content.
 *
 * @public
 */
@Component({
  selector: 'symphony-settings-window-view',
  host: { class: 'block' },
  imports: [AppComponent, SettingsView],
  templateUrl: './SettingsWindowView.html',
  styleUrl: './SettingsWindowView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsWindowView {
  // #region Fields

  protected readonly theme = inject(THEME);

  // #endregion
}
