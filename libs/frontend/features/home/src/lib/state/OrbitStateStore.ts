// #region Imports

import { Injectable, signal } from '@angular/core';
import type { IOrbitCamera } from '@symphony/frontend-ui';

// #endregion

/** Owns Home's project, object selection and camera poses across route changes. @public */
@Injectable({ providedIn: 'root' })
export class OrbitStateStore {
  // #region Fields

  /** Selected delivery target belongs to Home's object selection. @public @readonly */
  public readonly selectedTargetId = signal<string | undefined>(undefined);
  /** Selected Orbit project survives a trip to Board or Overview. @public @readonly */
  public readonly orbitRepositoryId = signal<string | undefined>(undefined);
  /** Exact object selection, including grouped tickets. @public @readonly */
  public readonly selectedOrbitNodeId = signal<string | undefined>(undefined);
  /** Camera poses remain scoped to the same workspace/project key. @public @readonly */
  public readonly orbitCameras = signal<Readonly<Record<string, IOrbitCamera>>>({});

  // #endregion
}
