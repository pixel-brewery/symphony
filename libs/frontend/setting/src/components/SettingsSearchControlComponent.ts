// #region Imports

import { NgComponentOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  Injector,
  input,
  signal,
  type Type,
} from '@angular/core';
import type { ISettingsSearchResult } from '../search/ISettingsSearchResult';
import { SETTINGS_SEARCH_RESULT } from '../search/SettingsSearchResultToken';

// #endregion

/**
 * Renders the in-place control a search result's entry contributes, so the setting changes right
 * in the result list. The control reads its result through `SETTINGS_SEARCH_RESULT`.
 *
 * @public
 */
@Component({
  selector: 'symphony-settings-search-control',
  host: { class: 'flex flex-none items-center' },
  imports: [NgComponentOutlet],
  templateUrl: './SettingsSearchControlComponent.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSearchControlComponent {
  // #region Fields

  private readonly _injector = inject(Injector);
  private readonly _component = signal<Type<unknown> | undefined>(undefined);

  /**
   * The loaded control component.
   *
   * @protected
   * @readonly
   */
  protected readonly component = this._component.asReadonly();

  /**
   * Injector giving the control its result.
   *
   * @protected
   * @readonly
   */
  protected readonly controlInjector = computed(() =>
    Injector.create({
      parent: this._injector,
      providers: [{ provide: SETTINGS_SEARCH_RESULT, useValue: this.result() }],
    }),
  );

  // #endregion

  // #region Ctor

  /**
   * Loads the contributed control whenever the result changes.
   *
   * @public
   */
  public constructor() {
    effect(() => {
      const load = this.result().entry.loadControl;
      this._component.set(undefined);
      if (load) void load().then((component) => this._component.set(component));
    });
  }

  // #endregion

  // #region Properties

  /**
   * The search result whose control is shown.
   *
   * @public
   * @readonly
   */
  public readonly result = input.required<ISettingsSearchResult>();

  // #endregion
}
