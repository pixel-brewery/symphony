// #region Imports

import {
  reiconAlertCircle,
  reiconArrowLeft,
  reiconBranchUp,
  reiconCheckCircle,
  reiconHome,
  reiconInfoCircle,
  reiconKanban,
  reiconLinkOff,
  reiconPlayCircle,
  reiconSettings,
} from '@pixel-brewery/mosaik-icons/reicon';
import { simpleGithub } from '@pixel-brewery/mosaik-icons/simple-icons';

// #endregion

/** Reicon navigation glyphs and package-provided provider marks registered by the mobile shell. */
export const mobileNavigationIcons = {
  back: reiconArrowLeft,
  home: reiconHome,
  board: reiconKanban,
  tickets: reiconCheckCircle,
  processes: reiconPlayCircle,
  connection: reiconLinkOff,
  errorCircle: reiconAlertCircle,
  info: reiconInfoCircle,
  mergeRequests: reiconBranchUp,
  settings: reiconSettings,
  github: simpleGithub,
};
