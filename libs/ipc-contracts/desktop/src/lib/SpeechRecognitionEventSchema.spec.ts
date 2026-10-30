// #region Imports

import { describe, expect, it } from 'vitest';
import { speechRecognitionEventSchema } from './SpeechRecognitionEventSchema';

// #endregion

describe('speechRecognitionEventSchema', () => {
  it('accepts a bounded native speech result', () => {
    // arrange
    const event = { kind: 'result', transcript: 'Search the active workspace', isFinal: true };

    // act
    const parsed = speechRecognitionEventSchema.parse(event);

    // assert
    expect(parsed).toEqual(event);
  });

  it('rejects an unrecognized native error code', () => {
    // arrange
    const event = { kind: 'error', code: 'raw-native-error', message: 'Failure' };

    // act
    const parsed = speechRecognitionEventSchema.safeParse(event);

    // assert
    expect(parsed.success).toBe(false);
  });
});
