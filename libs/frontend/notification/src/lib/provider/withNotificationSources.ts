// #region Imports

import type { Provider, Type } from '@angular/core';
import type { INotificationSource } from '../sources/INotificationSource';
import type { INotificationContribution } from './INotificationContribution';
import { NOTIFICATION_SOURCES } from './NotificationSources';

// #endregion

/**
 * Contributes feature-owned notification sources to the notification centre. Each source is one
 * injectable per window and joins the `NOTIFICATION_SOURCES` multi-provider.
 *
 * @param options - Unique identifier and the source classes of the owning feature.
 * @returns The contribution to spread into the feature's providers with `provide()`.
 * @public
 */
export function withNotificationSources(options: {
  readonly id: string;
  readonly sources: Type<INotificationSource> | readonly Type<INotificationSource>[];
}): INotificationContribution {
  const sources: readonly Type<INotificationSource>[] = Array.isArray(options.sources)
    ? options.sources
    : [options.sources as Type<INotificationSource>];
  const providers: readonly Provider[] = Object.freeze(
    sources.flatMap((source) => [
      source,
      { provide: NOTIFICATION_SOURCES, useExisting: source, multi: true },
    ]),
  );
  return Object.freeze({ id: options.id, provide: (): readonly Provider[] => providers });
}
