// #region Imports

import type { Signal } from '@angular/core';
import type { ApplicationSettingsDto } from '@symphony/ipc-contracts-composition';

// #endregion

/** Feedback consumes the authoritative settings and their existing aggregate writer. @public */
export interface IFeedbackSettingsContext {
  /** The validated configuration, read live before each write. @public @readonly */
  readonly settings: Signal<ApplicationSettingsDto | undefined>;
  /** Whole-settings persistence in progress. @public @readonly */
  readonly configurationBusy: Signal<boolean>;
  /** Shared exclusion between settings operations. @public @readonly */
  readonly editorBusy: Signal<boolean>;
  /** Loads the authoritative aggregate when opening an unhydrated editor. @public */
  refreshConfiguration(): Promise<void>;
  /** Persists through the single existing validation and settings writer. @public */
  saveSettings(settings: ApplicationSettingsDto, successMessage?: string | false): Promise<boolean>;
}
