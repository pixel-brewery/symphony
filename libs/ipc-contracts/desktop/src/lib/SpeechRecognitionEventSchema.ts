// #region Imports

import { z } from 'zod';

// #endregion

export const speechRecognitionEventSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('result'),
    transcript: z.string().trim().min(1).max(20_000),
    isFinal: z.boolean(),
  }),
  z.object({
    kind: z.literal('state'),
    state: z.enum(['idle', 'starting', 'listening', 'stopping', 'stopped', 'error']),
  }),
  z.object({
    kind: z.literal('error'),
    code: z.enum([
      'unavailable',
      'permission-denied',
      'unsupported-locale',
      'unsupported-input',
      'missing-audio-track',
      'no-speech-detected',
      'backend-failure',
      'invalid-state',
      'unknown',
    ]),
    message: z.string().trim().min(1).max(500),
  }),
]);
