// #region Imports

import { z } from 'zod';
import type { DesktopRequestMethod } from './DesktopRequestMethod';
import { desktopRequestSchemas } from './DesktopRequestSchemas';

// #endregion

export type DesktopRequestPayload<M extends DesktopRequestMethod> = z.infer<
  (typeof desktopRequestSchemas)[M]
>;
