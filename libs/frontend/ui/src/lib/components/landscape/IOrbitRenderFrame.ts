// #region Imports

import type { IOrbitCamera } from './IOrbitCamera';
import type { IOrbitLabel } from './IOrbitLabel';
import type { IOrbitFlybyLabel } from './IOrbitFlybyLabel';

// #endregion

/** One demand-rendered camera/label snapshot, without exposing Three.js to Angular. @public */
export interface IOrbitRenderFrame {
  readonly camera: IOrbitCamera;
  readonly labels: readonly IOrbitLabel[];
  readonly zoomLevel: 'system' | 'groups' | 'tickets';
  readonly state: 'ready' | 'animating' | 'paused' | 'context-lost';
  readonly ticketCount: number;
  readonly assetState: 'loading' | 'ready' | 'unavailable';
  readonly flybys?: readonly IOrbitFlybyLabel[];
  readonly activeFlybyCount?: number;
}
