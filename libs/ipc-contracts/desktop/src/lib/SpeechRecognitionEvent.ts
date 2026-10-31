// #region Imports

import { z } from 'zod';
import { speechRecognitionEventSchema } from './SpeechRecognitionEventSchema';

// #endregion

export type SpeechRecognitionEvent = z.infer<typeof speechRecognitionEventSchema>;
