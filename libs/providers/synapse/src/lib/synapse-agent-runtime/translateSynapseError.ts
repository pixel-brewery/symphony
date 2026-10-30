// #region Imports

import { AiError } from '@pixel-brewery/synapse-core';
import {
  AgentContinuationUnavailableError,
  AgentInterruptionError,
} from '@symphony/application-ai';
import { AgentAccountCapacityError } from '../agent-account-cooldown/AgentAccountCapacityError.js';
import { SynapseHostProgressError } from './errors/SynapseHostProgressError.js';

// #endregion

/**
 * Preserves Symphony's durable recovery subclasses without retrying host failures.
 *
 * @param cause - Native runtime or host failure from the shared bridge.
 * @returns The correct existing recovery error, or the original terminal error.
 *
 * @public
 */
export function translateSynapseError(cause: unknown): Error {
  if (cause instanceof SynapseHostProgressError) return cause;

  if (!(cause instanceof AiError))
    return cause instanceof Error ? cause : new Error('The AI operation failed.', { cause });

  if (cause.cause instanceof SynapseHostProgressError) return cause.cause;

  if (
    cause.code === 'host' ||
    cause.code === 'persistence' ||
    cause.code === 'cancelled' ||
    cause.code === 'timeout'
  )
    return cause;

  const retryAt =
    typeof cause.retryAt === 'number' &&
    Number.isFinite(cause.retryAt) &&
    Math.abs(cause.retryAt) <= 8_640_000_000_000_000
      ? new Date(cause.retryAt).toISOString()
      : undefined;

  if (cause.code === 'session-unavailable' || (cause.retryable && !cause.sessionUsable))
    return new AgentContinuationUnavailableError(cause.message, {
      cause,
      ...(retryAt ? { retryAt } : {}),
    });

  if (
    (cause.code === 'quota' || cause.code === 'rate-limit') &&
    cause.capacityScope === 'account' &&
    cause.retryable
  )
    return new AgentAccountCapacityError(cause.message, {
      cause,
      reason: cause.code === 'quota' ? 'quota-exhausted' : 'rate-limited',
      ...(retryAt ? { retryAt } : {}),
    });

  if (cause.retryable)
    return new AgentInterruptionError(cause.message, { cause, ...(retryAt ? { retryAt } : {}) });

  return cause;
}
