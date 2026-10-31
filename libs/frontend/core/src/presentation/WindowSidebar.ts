// #region Imports

import { computed, Injectable, signal, type Signal, type TemplateRef } from '@angular/core';

// #endregion

interface IWindowSidebarRegistration {
  readonly owner: object;
  readonly content: TemplateRef<unknown>;
}

/**
 * Holds the navigation a routed screen shows in place of the main window's source list.
 *
 * Most screens keep the sidebar's destinations. A screen with its own navigation, such as
 * Settings, registers it through `WindowSidebarDirective`; while that screen is open the sidebar
 * shows only that navigation, and the toolbar's back navigation leads out of it again.
 * Registrations are owned, so a screen that is being destroyed after its successor already
 * registered cannot clear the successor's navigation.
 *
 * @public
 */
@Injectable({ providedIn: 'root' })
export class WindowSidebar {
  // #region Fields

  private readonly _registrations = signal<readonly IWindowSidebarRegistration[]>([]);

  /**
   * Navigation that replaces the sidebar's destinations, while a screen provides one.
   *
   * @public
   * @readonly
   */
  public readonly content: Signal<TemplateRef<unknown> | undefined> = computed(
    () => this._registrations().at(-1)?.content,
  );

  /**
   * Whether a screen currently replaces the sidebar's destinations.
   *
   * @public
   * @readonly
   */
  public readonly isReplaced: Signal<boolean> = computed(() => this.content() !== undefined);

  // #endregion

  // #region Methods

  /**
   * Registers or replaces the sidebar navigation of one screen.
   *
   * @param owner - Identity of the registering screen.
   * @param content - Navigation rendered in the sidebar.
   * @public
   */
  public register(owner: object, content: TemplateRef<unknown>): void {
    this._registrations.update((current) => [
      ...current.filter((entry) => entry.owner !== owner),
      { owner, content },
    ]);
  }

  /**
   * Removes the sidebar navigation of one screen.
   *
   * @param owner - Identity of the screen that registered it.
   * @public
   */
  public unregister(owner: object): void {
    this._registrations.update((current) => current.filter((entry) => entry.owner !== owner));
  }

  // #endregion
}
