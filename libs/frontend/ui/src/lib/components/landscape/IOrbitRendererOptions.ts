// #region Imports

import type { IOrbitPalette } from './IOrbitPalette';
import type { IOrbitRenderFrame } from './IOrbitRenderFrame';
import type { IOrbitCamera } from './IOrbitCamera';

// #endregion

/** Callbacks and public theme values passed across the lazy rendering boundary. @public */
export interface IOrbitRendererOptions {
  readonly palette: IOrbitPalette;
  readonly reducedMotion: boolean;
  /** Body portraits omit the background stars; interactive scenes retain them by default. */
  readonly showStars?: boolean;
  readonly frame: (frame: IOrbitRenderFrame) => void;
  readonly selected: (id: string) => void;
  readonly cameraChanged: (camera: IOrbitCamera) => void;
  readonly failed: () => void;
}
