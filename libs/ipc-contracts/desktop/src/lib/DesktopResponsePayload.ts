// #region Imports

import { z } from 'zod';
import type { DesktopRequestMethod } from './DesktopRequestMethod';
import { desktopResponseSchemas } from './DesktopResponseSchemas';

// #endregion

export type DesktopResponsePayload<M extends DesktopRequestMethod> = z.infer<
  (typeof desktopResponseSchemas)[M]
>;
