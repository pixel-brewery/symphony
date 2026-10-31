// #region Imports

import { ubuntuGuestReleases } from './UbuntuGuestReleases';

// #endregion

export function ubuntuGuestReleaseForFamily(
  family: string,
): (typeof ubuntuGuestReleases)[number] | undefined {
  return ubuntuGuestReleases.find((release) => release.family === family);
}
