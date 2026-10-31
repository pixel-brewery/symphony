// #region Imports

import { ChangeDetectionStrategy, Component } from '@angular/core';
import {
  ButtonComponent,
  DialogContentDirective,
  DialogFooterDirective,
  IconComponent,
  IconNameDirective,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { SettingsAlertIconPipe } from '../pipes/SettingsAlertIconPipe';
import { SettingsAlertSheetViewPresenter } from '../view-presenters/SettingsAlertSheetViewPresenter';

// #endregion

/**
 * An alert sheet of the Settings window: icon, question, consequences and the answer buttons.
 *
 * @public
 */
@Component({
  selector: 'symphony-settings-alert-sheet-view',
  host: { class: 'block' },
  imports: [
    ButtonComponent,
    DialogContentDirective,
    DialogFooterDirective,
    IconComponent,
    IconNameDirective,
    SettingsAlertIconPipe,
    TextComponent,
    TypographyDirective,
  ],
  providers: [
    SettingsAlertSheetViewPresenter,
    { provide: VIEW_PRESENTER, useExisting: SettingsAlertSheetViewPresenter },
  ],
  templateUrl: './SettingsAlertSheetView.html',
  styleUrl: './SettingsAlertSheetView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsAlertSheetView extends View<SettingsAlertSheetViewPresenter> {}
