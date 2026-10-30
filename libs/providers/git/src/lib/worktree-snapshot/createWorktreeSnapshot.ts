// #region Imports

import { join } from 'node:path';
import { lstatSync, mkdirSync, readFileSync, readlinkSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import type { IWorktreeSnapshot } from './IWorktreeSnapshot';
import type { IWorktreeSnapshotEntry } from './IWorktreeSnapshotEntry';
import type { IWorktreeSnapshotOptions } from './IWorktreeSnapshotOptions';
import { defaultExecute } from './defaultExecute';
import { isExcluded } from './isExcluded';
import { worktreeSnapshotHash } from './worktreeSnapshotHash';

// #endregion

/**
 * Produces a reproducible snapshot of the current worktree: `HEAD` plus staged and unstaged
 * modifications, additions, deletions, renames, and non-ignored untracked files. The archive
 * never contains `.git`, credential stores, ignored local environment files, build output,
 * dependency trees, or artifacts of an earlier test run.
 */
export async function createWorktreeSnapshot(
  options: IWorktreeSnapshotOptions,
): Promise<IWorktreeSnapshot> {
  const run = options.execute ?? defaultExecute;
  const worktreePath = options.worktreePath;
  const git = (...arguments_: readonly string[]): Promise<string> =>
    run('git', arguments_, worktreePath, options.signal);

  const insideWorktree = (await git('rev-parse', '--is-inside-work-tree').catch(() => '')).trim();
  if (insideWorktree !== 'true') {
    throw new Error('The selected path is not a Git worktree.');
  }
  const headCommit = (await git('rev-parse', 'HEAD').catch(() => '')).trim() || 'unborn';
  const branch = (await git('rev-parse', '--abbrev-ref', 'HEAD').catch(() => '')).trim() || 'HEAD';

  const candidates = splitNullSeparated(
    await git('ls-files', '-z', '--cached', '--others', '--exclude-standard', '--deduplicate'),
  );

  const entries: IWorktreeSnapshotEntry[] = [];
  const excludedPaths: string[] = [];
  const deletedPaths: string[] = [];
  let byteCount = 0;

  for (const relativePath of candidates) {
    if (isExcluded(relativePath)) {
      excludedPaths.push(relativePath);
      continue;
    }
    const absolutePath = join(worktreePath, relativePath);
    let stat;
    try {
      stat = lstatSync(absolutePath);
    } catch {
      // A tracked path missing from the worktree is a deletion and must stay out of the snapshot.
      deletedPaths.push(relativePath);
      continue;
    }
    if (stat.isDirectory()) continue;
    if (stat.isSymbolicLink()) {
      const target = readlinkSync(absolutePath);
      entries.push({
        path: relativePath,
        mode: 'symlink',
        contentHash: createHash('sha256').update(target).digest('hex'),
        byteCount: Buffer.byteLength(target),
      });
      continue;
    }
    if (!stat.isFile()) continue;
    byteCount += stat.size;
    if (entries.length >= MAX_SNAPSHOT_FILES) {
      throw new Error('The worktree snapshot exceeds the supported file count.');
    }
    if (byteCount > MAX_SNAPSHOT_BYTES) {
      throw new Error('The worktree snapshot exceeds the supported size.');
    }
    entries.push({
      path: relativePath,
      mode: (stat.mode & 0o111) === 0 ? 'file' : 'executable',
      contentHash: createHash('sha256').update(readFileSync(absolutePath)).digest('hex'),
      byteCount: stat.size,
    });
  }

  if (!entries.length) {
    throw new Error('The worktree snapshot is empty.');
  }

  entries.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
  const hash = worktreeSnapshotHash(headCommit, entries);

  mkdirSync(options.outputDirectory, { recursive: true, mode: 0o700 });
  const listPath = join(options.outputDirectory, 'worktree-snapshot.list');
  const archivePath = join(options.outputDirectory, 'worktree-snapshot.tar.gz');
  writeFileSync(listPath, `${entries.map((entry) => entry.path).join('\0')}\0`, { mode: 0o600 });
  await run(
    'tar',
    [
      ...(process.platform === 'darwin' ? ['--no-mac-metadata'] : []),
      '--no-xattrs',
      '-czf',
      archivePath,
      '-C',
      worktreePath,
      '--null',
      '-T',
      listPath,
    ],
    worktreePath,
    options.signal,
  );

  return {
    archivePath,
    hash,
    headCommit,
    branch,
    fileCount: entries.length,
    byteCount,
    excludedPaths,
    deletedPaths,
  };
}

const MAX_SNAPSHOT_FILES = 100_000;

const MAX_SNAPSHOT_BYTES = 4 * 1024 ** 3;

function splitNullSeparated(value: string): readonly string[] {
  return value
    .split('\0')
    .map((entry) => entry.trim())
    .filter(Boolean);
}
