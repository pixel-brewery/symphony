// #region Imports

import type { IAgentAppearance } from '@symphony/domain-team';

// #endregion

/** Resolves locally packaged characters, including saved legacy colours. @public */
export function agentFigureSource(
  appearance: IAgentAppearance,
  format: 'figure' | 'avatar' = 'figure',
): string {
  const characters = {
    blue: 'blue',
    mint: 'mint',
    coral: 'orange',
    violet: 'purple',
    gold: 'gold',
    rose: 'rose',
  } as const;
  const suffix = format === 'avatar' ? '-48' : '';
  return appearance.image ?? `figures/${characters[appearance.color]}${suffix}.png`;
}
