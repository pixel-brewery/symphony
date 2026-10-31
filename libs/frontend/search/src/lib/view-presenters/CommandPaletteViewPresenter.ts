// #region Imports

import { computed, inject, Injectable, linkedSignal, signal, type Signal } from '@angular/core';
import { Router } from '@angular/router';
import { Command, NavigationRegistry, ViewPresenter } from '@symphony/frontend-core';
import type { IPaletteResult } from '../models/IPaletteResult';
import type { IPaletteSection } from '../models/IPaletteSection';
import type { ISearchProvider } from '../models/ISearchProvider';
import { movePaletteSelection } from '../palette/movePaletteSelection';
import { projectContextualPaletteResults } from '../palette/projectContextualPaletteResults';
import { projectNavigationPaletteResults } from '../palette/projectNavigationPaletteResults';
import { projectPaletteSections } from '../palette/projectPaletteSections';
import { SEARCH_PROVIDERS } from '../provider/SearchProviders';
import { CommandPalette } from '../services/CommandPalette';
import { SearchManager } from '../services/SearchManager';

// #endregion

/**
 * Owns the command palette's query, its grouped results from the feature search providers and the
 * sidebar, the keyboard selection and opening a result.
 *
 * @public
 */
@Injectable()
export class CommandPaletteViewPresenter extends ViewPresenter {
  // #region Fields

  private readonly _palette = inject(CommandPalette);
  private readonly _router = inject(Router);
  private readonly _search = inject(SearchManager, { optional: true });
  private readonly _providers: readonly ISearchProvider[] = [
    ...(inject(SEARCH_PROVIDERS, { optional: true }) ?? []),
  ].sort((left, right) => left.order - right.order);
  private readonly _destinations = inject(NavigationRegistry).byRegion('desktop-main');
  private readonly _openedAt = this._router.url;
  private readonly _query = signal(this._palette.initialQuery());
  private readonly _trimmedQuery = computed(() => this._query().trim());
  private readonly _normalizedQuery = computed(() => this._trimmedQuery().toLocaleLowerCase());

  private readonly _sections = computed<readonly IPaletteSection[]>(() => {
    const query = this._trimmedQuery();
    const normalizedQuery = this._normalizedQuery();
    return projectPaletteSections([
      ...this.contextualResults(query),
      ...this._providers.flatMap(
        (provider) => provider.paletteResults?.(query, normalizedQuery) ?? [],
      ),
      ...projectNavigationPaletteResults(this._destinations(), normalizedQuery),
    ]);
  });

  private readonly _results = computed<readonly IPaletteResult[]>(() =>
    this._sections().flatMap((section) => section.results),
  );

  /** Typing starts the selection again at the first row. */
  private readonly _selectedIndex = linkedSignal({
    source: this._normalizedQuery,
    computation: () => 0,
  });

  private readonly _updateQueryCommand: Command<unknown> = new Command((input) =>
    this.onExecuteUpdateQueryCommand(input),
  );
  private readonly _moveSelectionCommand: Command<'next' | 'previous'> = new Command((direction) =>
    this.onExecuteMoveSelectionCommand(direction),
  );
  private readonly _selectCommand: Command<number> = new Command((index) =>
    this._selectedIndex.set(index),
  );
  private readonly _openCommand: Command<IPaletteResult | undefined> = new Command((result) =>
    this.onExecuteOpenCommand(result ?? this.selectedResult()),
  );
  private readonly _closeCommand: Command<void> = new Command(() => this._palette.close());

  // #endregion

  // #region Properties

  /**
   * Text in the palette's search field.
   *
   * @public
   * @readonly
   */
  public get query(): Signal<string> {
    return this._query.asReadonly();
  }

  /**
   * Trimmed search text, quoted by the no-results state.
   *
   * @public
   * @readonly
   */
  public get trimmedQuery(): Signal<string> {
    return this._trimmedQuery;
  }

  /**
   * Non-empty result groups in display order.
   *
   * @public
   * @readonly
   */
  public get sections(): Signal<readonly IPaletteSection[]> {
    return this._sections;
  }

  /**
   * Every listed row in keyboard order.
   *
   * @public
   * @readonly
   */
  public get results(): Signal<readonly IPaletteResult[]> {
    return this._results;
  }

  /**
   * Position of the selected row in keyboard order, kept within the listed rows.
   *
   * @public
   * @readonly
   */
  public readonly selectedIndex = computed(() =>
    Math.min(this._selectedIndex(), Math.max(this._results().length - 1, 0)),
  );

  /**
   * The row `↵` opens.
   *
   * @public
   * @readonly
   */
  public readonly selectedResult = computed<IPaletteResult | undefined>(
    () => this._results()[this.selectedIndex()],
  );

  /**
   * Whether text is typed and nothing matches it.
   *
   * @public
   * @readonly
   */
  public readonly hasNoResults = computed(
    () => this._trimmedQuery() !== '' && this._results().length === 0,
  );

  /** Takes the search field's text. @public @readonly */
  public get updateQueryCommand(): Command<unknown> {
    return this._updateQueryCommand;
  }

  /** Moves the selection one row down or up, wrapping around. @public @readonly */
  public get moveSelectionCommand(): Command<'next' | 'previous'> {
    return this._moveSelectionCommand;
  }

  /** Selects a row, for example under the pointer. @public @readonly */
  public get selectCommand(): Command<number> {
    return this._selectCommand;
  }

  /**
   * Closes the palette and opens a row, or the selected row without a parameter.
   *
   * @public
   * @readonly
   */
  public get openCommand(): Command<IPaletteResult | undefined> {
    return this._openCommand;
  }

  /** Closes the palette without opening anything. @public @readonly */
  public get closeCommand(): Command<void> {
    return this._closeCommand;
  }

  // #endregion

  // #region Methods

  private contextualResults(query: string): readonly IPaletteResult[] {
    const search = this._search;
    if (!search) return [];
    const [path = '', queryString = ''] = this._openedAt.split('?');
    const contextual = this._providers.some((provider) => provider.contextualPaths?.includes(path));
    if (!contextual) return [];
    const screenLabel =
      this._destinations().find((destination) => destination.route === path)?.label ??
      'this screen';
    return projectContextualPaletteResults({
      contextual,
      screenLabel,
      activeFilter: new URLSearchParams(queryString).get('q') ?? '',
      query,
      search: (text) => search.search(text),
    });
  }

  private onExecuteUpdateQueryCommand(input: unknown): void {
    const text =
      typeof input === 'string'
        ? input
        : input instanceof CustomEvent && typeof input.detail === 'string'
          ? input.detail
          : undefined;
    if (text !== undefined) this._query.set(text);
  }

  private onExecuteMoveSelectionCommand(direction: 'next' | 'previous'): void {
    this._selectedIndex.set(
      movePaletteSelection(this.selectedIndex(), this._results().length, direction),
    );
  }

  private onExecuteOpenCommand(result: IPaletteResult | undefined): void {
    if (!result) return;
    this._palette.close();
    const action = result.action;
    if (action.kind === 'navigate') {
      void this._router.navigate([action.path], { queryParams: action.queryParams ?? {} });
      return;
    }
    // The feature that owns the flow reports its own failure (for example as a notification).
    void Promise.resolve()
      .then(() => action.execute())
      .catch(() => undefined);
  }

  // #endregion
}
