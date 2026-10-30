// #region Imports

import { isAbsolute, relative, resolve } from 'node:path';

// #endregion

export function compactRoots(paths: readonly (string | undefined)[]): readonly string[] {
  const resolved = [
    ...new Set(paths.filter((path): path is string => Boolean(path)).map((path) => resolve(path))),
  ].sort((left, right) => left.length - right.length);
  return resolved.filter(
    (candidate, index) =>
      !resolved.some(
        (parent, parentIndex) =>
          parentIndex < index &&
          (candidate === parent ||
            (!relative(parent, candidate).startsWith('..') &&
              !isAbsolute(relative(parent, candidate)))),
      ),
  );
}
