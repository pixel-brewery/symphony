// #region Imports

import type { IBoardRouteStore } from './IBoardRouteStore';

// #endregion

/**
 * Hydrates the Board route from the durable snapshot without waiting for unrelated global
 * initialization work, then advances the provider projection in the background.
 *
 * Global initialization loads configuration, skills and storage; the cached snapshot is read beside
 * it and is not part of that promise. Without a snapshot the route therefore joins the cached read,
 * and without a cache it waits for the provider projection, so the board stays in its loading
 * presentation until its work items are known instead of presenting an empty board.
 *
 * @param store - Board route store.
 * @public
 */
export async function hydrateBoardRoute(store: IBoardRouteStore): Promise<void> {
  const initialization = store.initialize();
  if (!store.snapshot()) {
    await initialization;
    if (!store.snapshot()) await store.refresh(false);
    if (!store.snapshot()) {
      await store.refresh();
      return;
    }
  }
  void store.refresh();
}
