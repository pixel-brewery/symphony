// #region Imports

import { AgentAccountCapacityError } from './AgentAccountCapacityError';
import type { IAgentAccountCapacityClassificationOptions } from './IAgentAccountCapacityClassificationOptions';
import { parseAgentRetryAt } from './parseAgentRetryAt';

// #endregion

export function agentAccountCapacityErrorFor(
  message: string,
  options: IAgentAccountCapacityClassificationOptions = {},
): AgentAccountCapacityError | undefined {
  const quotaSignal =
    /(?:quota|usage|spend(?:ing)?|credits?|balance).{0,80}(?:exhausted|exceeded|depleted|insufficient|reached|used up|no (?:quota|credits?) (?:left|remaining))/iu.test(
      message,
    ) ||
    /(?:exhausted|exceeded|depleted|insufficient).{0,80}(?:quota|usage|credits?|balance)/iu.test(
      message,
    ) ||
    /(?:insufficient[_ -]?quota|credit balance.{0,30}(?:low|empty))/iu.test(message) ||
    /(?:hit|reached|exceeded).{0,40}(?:usage|weekly|monthly|plan|account).{0,40}limit/iu.test(
      message,
    ) ||
    (options.includeGenericRateLimit === true &&
      /(?:you(?:'ve| have)?\s+)?hit your limit/iu.test(message));
  const quotaExhausted =
    quotaSignal &&
    (options.requireAccountScope !== true ||
      /(?:account|connection|api[_ -]?key|credits?|balance|billing|plan|spend(?:ing)?|usage limit|(?:free|current|total) quota|insufficient[_ -]?quota)/iu.test(
        message,
      ));
  const rateLimited =
    options.includeGenericRateLimit === true &&
    /(?:\brate[_ -]?limit(?:ed|[_ -]?(?:exceeded|error))?\b|too many requests|(?:status|http)?\s*429\b)/iu.test(
      message,
    );
  const reason = quotaExhausted
    ? ('quota-exhausted' as const)
    : rateLimited
      ? ('rate-limited' as const)
      : undefined;
  if (!reason) return undefined;
  const retryAt = parseAgentRetryAt(message, options.now);
  return new AgentAccountCapacityError(message, {
    reason,
    ...(retryAt ? { retryAt } : {}),
  });
}
