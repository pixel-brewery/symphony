// #region Imports

import { DestroyRef, Directive, effect, inject, TemplateRef, untracked } from '@angular/core';
import { WindowSidebar } from './WindowSidebar';

// #endregion

/**
 * Hands a screen's own navigation to the main window's sidebar, where it replaces the
 * destinations while the screen is open.
 *
 * Place it on an `ng-template` in the screen's template; the content keeps the screen's bindings
 * and providers because it is declared there:
 *
 * ```html
 * <ng-template symphonyWindowSidebar>
 *   <symphony-settings-sidebar-view />
 * </ng-template>
 * ```
 *
 * @public
 */
@Directive({
  selector: 'ng-template[symphonyWindowSidebar]',
  standalone: true,
})
export class WindowSidebarDirective {
  // #region Ctor

  /**
   * Registers the navigation for the lifetime of the screen.
   *
   * @public
   */
  public constructor() {
    const sidebar = inject(WindowSidebar);
    const content = inject<TemplateRef<unknown>>(TemplateRef);
    // Registered from an effect, not while the screen's template renders: the sidebar reads the
    // registration from the window's own template.
    effect(() => untracked(() => sidebar.register(this, content)));
    inject(DestroyRef).onDestroy(() => sidebar.unregister(this));
  }

  // #endregion
}
