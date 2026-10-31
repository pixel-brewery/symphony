// #region Imports

import { type Observable } from 'rxjs';

// #endregion

export type HydrationOperation = Observable<unknown> | Promise<unknown> | undefined;
