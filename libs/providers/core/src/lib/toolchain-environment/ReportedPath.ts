// #region Imports

import { LOGIN_SHELL_MARKER } from './LoginShellMarker';

// #endregion

export /**
 * Startup files may print banners, so only the environment dump after the marker is read. `env`
 * rather than `$PATH` keeps the colon-separated form in shells that model PATH as a list.
 */
function reportedPath(output: string): string | undefined {
  const marker = output.lastIndexOf(LOGIN_SHELL_MARKER);
  if (marker < 0) return undefined;
  return /^PATH=(.*)$/mu.exec(output.slice(marker + LOGIN_SHELL_MARKER.length))?.[1];
}
