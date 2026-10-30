// #region Imports

import { join } from 'node:path';
import { mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { limaHomeAliasMatches } from './limaHomeAliasMatches';

// #endregion

export function shortLimaHome(runtimeRoot: string): string {
  const physicalLimaHome = join(runtimeRoot, 'lima');
  mkdirSync(physicalLimaHome, { recursive: true, mode: 0o700 });
  const digest = createHash('sha256').update(runtimeRoot).digest('hex').slice(0, 16);
  const alias = `/tmp/symphony-lima-${digest}`;
  if (limaHomeAliasMatches(alias, runtimeRoot)) return alias;
  // The alias name is derived from this runtime root alone, so an alias that resolves anywhere
  // else - or nowhere at all - belongs to a runtime root that is already gone. Replacing it is
  // what keeps one stale symlink in a shared temporary directory from disabling local CI for
  // every later start.
  rmSync(alias, { recursive: true, force: true });
  try {
    symlinkSync(physicalLimaHome, alias, 'dir');
  } catch (cause) {
    // A concurrent orchestrator may have created the very same alias in between.
    if (!limaHomeAliasMatches(alias, runtimeRoot)) {
      throw new Error('Unable to prepare the local CI runtime path.', { cause });
    }
  }
  return alias;
}
