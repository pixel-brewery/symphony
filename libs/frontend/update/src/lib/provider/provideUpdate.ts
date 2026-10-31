// #region Imports

import {
  inject,
  makeEnvironmentProviders,
  provideAppInitializer,
  type EnvironmentProviders,
} from '@angular/core';
import { DesktopUpdateStore } from '../state/DesktopUpdateStore';

// #endregion

/**
 * Owns the existing single-flight desktop update initialization at application startup.
 *
 * @returns The canonical update store and its existing startup initializer.
 * @public
 */
export function provideUpdate(): EnvironmentProviders {
  return makeEnvironmentProviders([
    DesktopUpdateStore,
    provideAppInitializer(() => inject(DesktopUpdateStore).initialize()),
  ]);
}
