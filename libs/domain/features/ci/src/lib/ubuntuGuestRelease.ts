// #region Imports

import { ubuntuGuestReleases } from './UbuntuGuestReleases';

// #endregion

export function ubuntuGuestRelease(
  version: string,
): (typeof ubuntuGuestReleases)[number] | undefined {
  return ubuntuGuestReleases.find((release) => release.version === version);
}
