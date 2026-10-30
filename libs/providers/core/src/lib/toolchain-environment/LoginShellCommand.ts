// #region Imports

import { LOGIN_SHELL_MARKER } from './LoginShellMarker';

// #endregion

export const LOGIN_SHELL_COMMAND = `printf '%s\\n' '${LOGIN_SHELL_MARKER}'; env`;
