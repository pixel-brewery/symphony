// #region Imports

import { SYSTEM_PATH_DIRECTORIES } from './SystemPathDirectories';
import { pathDirectories } from './pathDirectories';

// #endregion

export /** True when the process only received the operating system's default PATH. */
function startedWithoutUserEnvironment(environment: NodeJS.ProcessEnv): boolean {
  return pathDirectories(environment['PATH']).every((directory) =>
    SYSTEM_PATH_DIRECTORIES.has(directory),
  );
}
