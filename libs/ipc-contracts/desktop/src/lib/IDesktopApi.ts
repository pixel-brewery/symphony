// #region Imports

import type { DesktopNavigationPath } from './DesktopNavigationPath';
import type { DesktopRequestMethod } from './DesktopRequestMethod';
import type { DesktopRequestPayload } from './DesktopRequestPayload';
import type { DesktopResponsePayload } from './DesktopResponsePayload';
import type { IDesktopCapabilities } from './IDesktopCapabilities';
import type { PowerState } from './PowerState';
import type { SpeechRecognitionEvent } from './SpeechRecognitionEvent';
import type { UpdateState } from './UpdateState';

// #endregion

export interface IDesktopApi {
  /** Capabilities backed by the complete packaged desktop runtime. */
  readonly capabilities: IDesktopCapabilities;
  request<M extends DesktopRequestMethod>(
    method: M,
    payload: DesktopRequestPayload<M>,
  ): Promise<DesktopResponsePayload<M>>;
  onUpdateState(listener: (state: UpdateState) => void): () => void;
  onPowerState(listener: (state: PowerState) => void): () => void;
  onSpeechRecognitionEvent(listener: (event: SpeechRecognitionEvent) => void): () => void;
  /**
   * Receives in-app destinations the main process asks this window to open, such as the Inbox
   * from the menu-bar extra or a Settings section requested through `settings.open`.
   */
  onNavigate(listener: (path: DesktopNavigationPath) => void): () => void;
}
