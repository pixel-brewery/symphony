// #region Imports

import { encodeSessionReference, type AiEvent } from '@pixel-brewery/synapse-core';
import { boundedText } from '@pixel-brewery/synapse-runtime';
import type { IAgentProgress } from '@symphony/application-execution';

// #endregion

/**
 * Projects safe normalized AI events into Symphony's existing execution progress contract.
 *
 * @param event - Normalized library event, never a raw provider frame.
 * @param actor - Existing execution actor label.
 * @returns Relevant progress, or undefined for shell noise and duplicate internal assignment events.
 *
 * @public
 */
export function projectSynapseProgress(event: AiEvent, actor: string): IAgentProgress | undefined {
  switch (event.type) {
    case 'text':
      return { actor, category: 'message', message: boundedText(event.text) };
    case 'progress': {
      if (event.category === 'command') return undefined;

      const category =
        event.category === 'output'
          ? 'message'
          : event.category === 'error'
            ? 'status'
            : (event.category ?? 'status');

      return { actor, category, message: boundedText(event.message) };
    }
    case 'session':
      return {
        actor,
        category: 'status',
        message: `${actor} session is ready for interruption-safe recovery.`,
        continuationReference: encodeSessionReference(event.session),
      };
    case 'usage':
      return { actor, message: '', tokenUsage: event.usage };
    case 'attempt':
    case 'overflow':
      return undefined;
  }
}
