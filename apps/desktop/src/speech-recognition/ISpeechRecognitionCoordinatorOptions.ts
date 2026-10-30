// #region Imports

import type { SpeechSession } from 'electron-native-speech';
import type { SpeechRecognitionEvent } from '@symphony/ipc-contracts-desktop';

// #endregion

export interface ISpeechRecognitionCoordinatorOptions {
  readonly createSession: () => Promise<SpeechSession>;
  readonly disposeBackend: () => void;
  readonly publish: (event: SpeechRecognitionEvent) => void;
}
