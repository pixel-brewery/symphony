// #region Imports

import type { IWidgetTile } from '../models/IWidgetTile';

// #endregion

/** Preserves the existing subset-of-total live-work presentation. @public */
export function liveTile(
  values: Omit<IWidgetTile, 'live' | 'liveLabel' | 'attention'> & { readonly liveCount: number },
): IWidgetTile {
  const { liveCount, ...rest } = values;
  return {
    ...rest,
    live: liveCount > 0,
    ...(liveCount > 0 ? { liveLabel: `${liveCount} in progress` } : {}),
    attention: false,
  };
}
