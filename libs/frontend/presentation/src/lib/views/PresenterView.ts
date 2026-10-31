// #region Imports

import { NgTemplateOutlet } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import {
  AppComponent,
  ButtonComponent,
  IconNameDirective,
  SearchBoxComponent,
  SplitComponent,
  TextComponent,
  TooltipDirective,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { PaneSizeDirective, WindowToolbar } from '@symphony/frontend-core';
import { CommandPalette } from '@symphony/frontend-search';
import { CommandPaletteView } from '@symphony/frontend-search/views';
import { PRESENTATION_CONTEXT } from '../ports/PresentationContextToken';
import { PresenterViewPresenter } from '../view-presenters/PresenterViewPresenter';
import { WindowSidebarView } from './WindowSidebarView';
import { WindowStatusBarView } from './WindowStatusBarView';

// #endregion

/**
 * The main window: source-list sidebar, unified toolbar, routed screen and status bar.
 *
 * @public
 */
@Component({
  selector: 'symphony-presenter-view',
  host: {
    class: 'block',
    '(window:keydown)': 'handleShortcut($event)',
  },
  imports: [
    AppComponent,
    ButtonComponent,
    IconNameDirective,
    CommandPaletteView,
    NgTemplateOutlet,
    PaneSizeDirective,
    RouterOutlet,
    SearchBoxComponent,
    SplitComponent,
    TextComponent,
    TooltipDirective,
    TypographyDirective,
    WindowSidebarView,
    WindowStatusBarView,
  ],
  providers: [PresenterViewPresenter],
  templateUrl: './PresenterView.html',
  styleUrl: './PresenterView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PresenterView {
  // #region Fields

  protected readonly store = inject(PRESENTATION_CONTEXT);
  protected readonly presenter = inject(PresenterViewPresenter);
  protected readonly toolbar = inject(WindowToolbar);
  protected readonly palette = inject(CommandPalette);
  protected readonly isMacOS = /Mac/u.test(globalThis.navigator?.platform ?? '');

  private readonly _router = inject(Router);

  // #endregion

  // #region Methods

  /**
   * Opens the command palette from the toolbar search field instead of typing into the field.
   *
   * @param event - Focus or pointer event on the field.
   */
  protected openPalette(event: Event): void {
    event.preventDefault();
    (event.currentTarget as HTMLElement | null)?.blur();
    this.palette.open();
  }

  /**
   * Hands a printable key typed into the toolbar field to the palette as its first character.
   *
   * @param event - Key event on the field.
   */
  protected openPaletteWithText(event: KeyboardEvent): void {
    if (event.metaKey || event.ctrlKey || event.altKey) return;
    const text = event.key.length === 1 ? event.key : '';
    if (!text && event.key !== 'Enter' && event.key !== 'ArrowDown') return;
    event.preventDefault();
    this.palette.open(text);
  }

  /**
   * Window shortcuts: ⌘K (Ctrl+K off macOS) toggles the command palette, ⌘N (Ctrl+N) opens the
   * new-work-item sheet, and Escape closes the open palette.
   *
   * @param event - Key event that reached the window.
   */
  protected handleShortcut(event: KeyboardEvent): void {
    // The palette is modal: Escape closes it wherever the focus is, also in the moment before its
    // search field has taken the focus. The palette's own handler stops an Escape it closed on.
    if (event.key === 'Escape' && this.palette.isOpen()) {
      event.preventDefault();
      this.palette.close();
      return;
    }
    const modifier = this.isMacOS ? event.metaKey : event.ctrlKey;
    if (!modifier || event.altKey || event.shiftKey) return;
    const key = event.key.toLowerCase();
    if (key === 'k') {
      event.preventDefault();
      this.palette.toggle();
    } else if (key === 'n') {
      event.preventDefault();
      this.palette.close();
      void this._router.navigate(['/main/board'], { queryParams: { create: 'true' } });
    }
  }

  // #endregion
}
