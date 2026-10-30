// #region Imports

import type { Signal } from '@angular/core';
import type { ParamMap } from '@angular/router';
import type { SettingsHostSession } from '../context/SettingsHostSession';
import type { ISettingsEditorRequest } from '../editor/ISettingsEditorRequest';

// #endregion

/** Explicit route scope passed once to each selected feature's Settings initializer. @public */
export interface ISettingsRouteContext {
  /** Reactive parameters of this concrete Settings route. @public @readonly */
  readonly parameters: Signal<ParamMap>;
  /** Route-scoped section and workspace selection. @public @readonly */
  readonly session: SettingsHostSession;
  /** Opens one feature-owned editor with the host's existing follow-up navigation. @public @readonly */
  readonly openEditor: <TRequest extends ISettingsEditorRequest>(request: TRequest) => void;
}
