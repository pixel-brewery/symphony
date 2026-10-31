// #region Imports

import { promisify } from 'node:util';
import { execFile } from 'node:child_process';

// #endregion

/**
 * Shares the existing promisified Node subprocess primitive between provider adapters.
 *
 * @public
 */
export const execFileAsync = promisify(execFile);
