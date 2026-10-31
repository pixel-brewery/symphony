// #region Imports

import { z } from 'zod';

// #endregion

export const storagePressureSchema = z.enum(['healthy', 'warning', 'danger', 'critical']);
