// #region Imports

import type { Type } from '@angular/core';
import { createFeature, type IFeature } from '@symphony/frontend-core';
import type { IQuickCreateItemSource } from '../models/IQuickCreateItemSource';
import type { QuickCreateFeatureKind } from './QuickCreateFeatureKind';
import { QuickCreateFeatureKinds } from './QuickCreateFeatureKinds';
import { QUICK_CREATE_SOURCES } from './QuickCreateSources';

// #endregion

/**
 * Registers dynamic authoring sources owned by an included feature.
 *
 * @param options - Unique contribution identity and its actual source implementations.
 * @returns A contribution for the explicit quick-create composition.
 * @public
 */
export function withQuickCreateItems(options: {
  readonly id: string;
  readonly sources: readonly Type<IQuickCreateItemSource>[];
}): IFeature<QuickCreateFeatureKind> {
  return createFeature(
    options.id,
    QuickCreateFeatureKinds.Source,
    options.sources.flatMap((source) => [
      { provide: source, useClass: source },
      { provide: QUICK_CREATE_SOURCES, useExisting: source, multi: true },
    ]),
    { multi: true },
  );
}
