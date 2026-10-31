// #region Imports

import { describe, expect, it } from 'vitest';
import { AiError } from '@pixel-brewery/synapse-core';
import {
  AgentContinuationUnavailableError,
  AgentInterruptionError,
} from '@symphony/application-ai';
import { AgentAccountCapacityError } from '../agent-account-cooldown/AgentAccountCapacityError.js';
import { SynapseHostProgressError } from './errors/SynapseHostProgressError.js';
import { translateSynapseError } from './translateSynapseError.js';

// #endregion

describe('translateSynapseError', () => {
  it('keeps transient provider failure compatible with durable AnalyzerService recovery', () => {
    // arrange
    const cause = new AiError('provider', 'Native transport was interrupted.', {
      retryable: true,
      retryAt: Date.parse('2026-10-29T10:00:00.000Z'),
    });

    // act
    const translated = translateSynapseError(cause);

    // assert
    expect(translated).toBeInstanceOf(AgentInterruptionError);
    expect(translated).toHaveProperty('retryAt', '2026-10-29T10:00:00.000Z');
    expect(translated).toHaveProperty('cause', cause);
  });

  it('uses the existing unusable-session subtype so durable recovery clears the continuation', () => {
    // arrange
    const cause = new AiError('session-unavailable', 'Native session is unavailable.', {
      sessionUsable: false,
    });

    // act
    const translated = translateSynapseError(cause);

    // assert
    expect(translated).toBeInstanceOf(AgentContinuationUnavailableError);
  });

  it.each(['quota', 'rate-limit'] as const)(
    'keeps account-scoped %s pause and recovery metadata',
    (code) => {
      // arrange
      const cause = new AiError(code, 'Native account capacity is unavailable.', {
        retryable: true,
        capacityScope: 'account',
        retryAt: Date.parse('2026-10-29T10:00:00.000Z'),
      });

      // act
      const translated = translateSynapseError(cause);

      // assert
      expect(translated).toBeInstanceOf(AgentAccountCapacityError);
      expect(translated).toHaveProperty(
        'reason',
        code === 'quota' ? 'quota-exhausted' : 'rate-limited',
      );
      expect(translated).toHaveProperty('retryAt', '2026-10-29T10:00:00.000Z');
      expect(translated).toHaveProperty('recoveryMessage', expect.any(String));
    },
  );

  it.each(['model', undefined] as const)(
    'does not pause the whole account for %s capacity scope',
    (scope) => {
      // arrange
      const cause = new AiError('rate-limit', 'Native model capacity is unavailable.', {
        retryable: true,
        ...(scope ? { capacityScope: scope } : {}),
      });

      // act
      const translated = translateSynapseError(cause);

      // assert
      expect(translated).toBeInstanceOf(AgentInterruptionError);
      expect(translated).not.toBeInstanceOf(AgentAccountCapacityError);
    },
  );

  it.each(['host', 'persistence', 'cancelled', 'timeout'] as const)(
    'never turns %s into a retryable provider interruption',
    (code) => {
      // arrange
      const cause = new AiError(code, 'Terminal host outcome.', {
        retryable: true,
        sessionUsable: false,
      });

      // act
      const translated = translateSynapseError(cause);

      // assert
      expect(translated).toBe(cause);
      expect(translated).not.toBeInstanceOf(AgentInterruptionError);
    },
  );

  it('restores the exact host sentinel when critical progress was wrapped by the library', () => {
    // arrange
    const sentinel = new SynapseHostProgressError(new Error('Synthetic storage failure.'));
    const cause = new AiError('persistence', 'Critical progress failed.', { cause: sentinel });

    // act
    const translated = translateSynapseError(cause);

    // assert
    expect(translated).toBe(sentinel);
  });
});
