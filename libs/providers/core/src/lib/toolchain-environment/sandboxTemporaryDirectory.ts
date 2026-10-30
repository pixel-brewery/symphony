// #region Imports

import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { chmodSync, lstatSync, mkdirSync, mkdtempSync } from 'node:fs';
import { shortTemporaryRoot } from './ShortTemporaryRoot';

// #endregion

/**
 * Temporary directory for a sandboxed toolchain run.
 *
 * Unix domain sockets hold about 100 characters and Nx rejects any socket path over 95, while the
 * tools that open them derive the path from TMPDIR. A managed runtime root
 * (`~/.symphony/workspaces/<workspace>/…`) already spends that whole budget, so `nx` fails to load
 * its plugins before a single check runs. Sandboxed runs therefore keep their temporary files in a
 * short private directory named after the runtime root that owns it, so every step of one run
 * shares one directory and the caller can discard it again. A short alias inside the runtime root
 * is not an option: the tooling resolves TMPDIR to its real path before building a socket path.
 */
export function sandboxTemporaryDirectory(runtimeRoot: string): string {
  const root = shortTemporaryRoot();
  const directory = join(
    root,
    `symphony-tmp-${createHash('sha256').update(runtimeRoot).digest('hex').slice(0, 16)}`,
  );
  try {
    mkdirSync(directory, { recursive: true, mode: 0o700 });
    if (privateDirectory(directory)) {
      chmodSync(directory, 0o700);
      return directory;
    }
  } catch {
    // A directory that cannot be created or secured is replaced by the random one below.
  }
  // Something Symphony does not own holds that name; a random directory keeps the run isolated.
  return mkdtempSync(join(root, 'symphony-tmp-'));
}

/** True when the path is a directory this user owns, rather than a symbolic link planted in it. */
function privateDirectory(directory: string): boolean {
  const status = lstatSync(directory);
  const user = process.getuid?.();
  return status.isDirectory() && (user === undefined || status.uid === user);
}
