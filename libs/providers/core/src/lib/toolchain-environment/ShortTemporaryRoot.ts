// #region Imports

import { tmpdir } from 'node:os';

// #endregion

export /**
 * The per-user temporary directory macOS hands to a process already spends half of the socket
 * budget, so sandboxes use the short directory every POSIX system provides.
 */
function shortTemporaryRoot(): string {
  return process.platform === 'win32' ? tmpdir() : '/tmp';
}
