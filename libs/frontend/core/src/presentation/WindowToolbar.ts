// #region Imports

import { computed, Injectable, signal, type Signal, type TemplateRef } from '@angular/core';

// #endregion

interface IWindowToolbarRegistration {
  readonly owner: object;
  readonly title: string;
  readonly subtitle: string;
  readonly actions?: TemplateRef<unknown>;
}

/**
 * Holds what the routed screen shows in the window's unified toolbar: its title, its one-line
 * subtitle and its contextual actions.
 *
 * The toolbar belongs to the window chrome, while the title and the actions belong to the screen.
 * A screen registers them through `WindowToolbarDirective`; the chrome renders the latest
 * registration. Registrations are owned, so a screen that is being destroyed after its successor
 * already registered cannot clear the successor's toolbar.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class WindowToolbar {
  // #region Fields

  private readonly _registrations = signal<readonly IWindowToolbarRegistration[]>([]);
  private readonly _current = computed(() => this._registrations().at(-1));

  /**
   * Title of the current screen, empty while no screen registered one.
   *
   * @public
   * @readonly
   */
  public readonly title: Signal<string> = computed(() => this._current()?.title ?? '');

  /**
   * One-line subtitle of the current screen.
   *
   * @public
   * @readonly
   */
  public readonly subtitle: Signal<string> = computed(() => this._current()?.subtitle ?? '');

  /**
   * Contextual actions of the current screen, rendered at the trailing end of the toolbar.
   *
   * @public
   * @readonly
   */
  public readonly actions: Signal<TemplateRef<unknown> | undefined> = computed(
    () => this._current()?.actions,
  );

  // #endregion

  // #region Methods

  /**
   * Registers or replaces the toolbar content of one screen.
   *
   * @param owner - Identity of the registering screen.
   * @param title - Screen title.
   * @param subtitle - One-line subtitle.
   * @param actions - Optional contextual actions.
   * @public
   */
  public register(
    owner: object,
    title: string,
    subtitle: string,
    actions?: TemplateRef<unknown>,
  ): void {
    const registration: IWindowToolbarRegistration = {
      owner,
      title,
      subtitle,
      ...(actions ? { actions } : {}),
    };
    this._registrations.update((current) => {
      const index = current.findIndex((entry) => entry.owner === owner);
      if (index < 0) return [...current, registration];
      return current.map((entry, position) => (position === index ? registration : entry));
    });
  }

  /**
   * Removes the toolbar content of one screen.
   *
   * @param owner - Identity of the screen that registered it.
   * @public
   */
  public unregister(owner: object): void {
    this._registrations.update((current) => current.filter((entry) => entry.owner !== owner));
  }

  // #endregion
}
