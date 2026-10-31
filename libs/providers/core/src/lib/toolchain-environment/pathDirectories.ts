// #region Imports

import { delimiter, isAbsolute } from 'node:path';

// #endregion

export function pathDirectories(value: string | undefined): readonly string[] {
  return (value ?? '')
    .split(delimiter)
    .map((directory) => directory.trim())
    .filter((directory) => isAbsolute(directory));
}
