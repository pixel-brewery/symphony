// #region Imports

import {
  afterNextRender,
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  viewChild,
} from '@angular/core';
import {
  BackdropComponent,
  CardComponent,
  EmptyStateComponent,
  IconComponent,
  KbdComponent,
  SearchBoxComponent,
  TextComponent,
  TypographyDirective,
} from '@pixel-brewery/mosaik-elements-angular';
import { View, VIEW_PRESENTER } from '@symphony/frontend-core';
import { resolvePaletteKeyCommand } from '../palette/resolvePaletteKeyCommand';
import { PaletteGroupLabelPipe } from '../pipes/PaletteGroupLabelPipe';
import { CommandPaletteViewPresenter } from '../view-presenters/CommandPaletteViewPresenter';

// #endregion

/**
 * The ⌘K command palette: a centred overlay over the dimmed window that searches work items, pull
 * requests, action runs and commands. `↑` and `↓` move the selection, `↵` opens it and `esc` or a
 * click on the dimmed window closes the palette.
 *
 * @public
 */
@Component({
  selector: 'symphony-command-palette',
  host: { class: 'absolute inset-0 z-10 block' },
  imports: [
    BackdropComponent,
    CardComponent,
    EmptyStateComponent,
    IconComponent,
    KbdComponent,
    PaletteGroupLabelPipe,
    SearchBoxComponent,
    TextComponent,
    TypographyDirective,
  ],
  providers: [{ provide: VIEW_PRESENTER, useClass: CommandPaletteViewPresenter }],
  templateUrl: './CommandPaletteView.html',
  styleUrl: './CommandPaletteView.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CommandPaletteView extends View<CommandPaletteViewPresenter> {
  // #region Fields

  /** Shortcuts read `⌘N` on macOS and `Ctrl + N` elsewhere. @protected @readonly */
  protected readonly isMacOS = /Mac/u.test(globalThis.navigator?.platform ?? '');

  private readonly _host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly _searchBox = viewChild(SearchBoxComponent);
  private readonly _opener = globalThis.document?.activeElement as HTMLElement | null | undefined;

  // #endregion

  // #region Ctor

  /** Focuses the search field on open and keeps the selected row in view. @public */
  public constructor() {
    super();
    afterNextRender(() => this.focusSearchField());
    afterRenderEffect(() => {
      const index = this.presenter.selectedIndex();
      this._host.nativeElement
        .querySelector(`#command-palette-option-${index}`)
        ?.scrollIntoView?.({ block: 'nearest' });
    });
  }

  // #endregion

  // #region Methods

  /**
   * Returns focus to where it was before the palette opened, unless that was the toolbar field
   * that opens the palette (its focus would open it again).
   *
   * @public
   * @override
   */
  public override ngOnDestroy(): void {
    super.ngOnDestroy();
    const opener = this._opener;
    if (opener?.isConnected && opener.getAttribute('aria-haspopup') !== 'dialog') opener.focus();
  }

  /**
   * Handles the palette's keys: `↑`/`↓` move, `↵` opens, `esc` closes, `Tab` stays in the palette.
   *
   * @param event - Key event from the search field or a row.
   */
  protected onKeydown(event: KeyboardEvent): void {
    const command = resolvePaletteKeyCommand(event);
    if (!command) return;
    event.preventDefault();
    switch (command) {
      case 'next':
      case 'previous':
        this.presenter.moveSelectionCommand.execute(command);
        return;
      case 'open':
        this.presenter.openCommand.execute();
        return;
      case 'close':
        event.stopPropagation();
        this.presenter.closeCommand.execute();
        return;
      case 'stay':
        this.focusSearchField();
        return;
    }
  }

  private focusSearchField(): void {
    const field = this._searchBox()?.elementRef.nativeElement;
    if (!field) return;
    field.focus();
    // The field renders its input on connection; a first focus can precede that render.
    if (!field.matches(':focus-within')) requestAnimationFrame(() => field.focus());
  }

  // #endregion
}
