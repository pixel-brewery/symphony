// #region Imports

import { ubuntuGuestReleases } from './UbuntuGuestReleases';

// #endregion

export type RunnerImageFamily = (typeof ubuntuGuestReleases)[number]['family'];
