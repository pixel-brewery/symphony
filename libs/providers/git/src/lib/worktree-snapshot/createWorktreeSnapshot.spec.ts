// #region Imports

import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createWorktreeSnapshot } from './createWorktreeSnapshot';
import { defaultExecute } from './defaultExecute';

// #endregion

const temporaryDirectories: string[] = [];

afterEach(() => {
  vi.unstubAllEnvs();
  for (const directory of temporaryDirectories.splice(0)) {
    // Windows keeps files of a just-finished Git process locked for a moment.
    rmSync(directory, { recursive: true, force: true, maxRetries: 3 });
  }
});

function git(worktree: string, ...arguments_: readonly string[]): void {
  execFileSync('git', arguments_, {
    cwd: worktree,
    stdio: 'pipe',
    env: {
      ...process.env,
      GIT_AUTHOR_NAME: 'Symphony',
      GIT_AUTHOR_EMAIL: 'symphony@example.invalid',
      GIT_COMMITTER_NAME: 'Symphony',
      GIT_COMMITTER_EMAIL: 'symphony@example.invalid',
    },
  });
}

function createRepository(): string {
  const worktree = mkdtempSync(join(tmpdir(), 'worktree-snapshot-'));
  const gitHome = mkdtempSync(join(tmpdir(), 'worktree-snapshot-git-home-'));
  temporaryDirectories.push(worktree, gitHome);
  const globalConfiguration = join(gitHome, 'global.config');
  const systemConfiguration = join(gitHome, 'system.config');
  writeFileSync(globalConfiguration, '');
  writeFileSync(systemConfiguration, '');
  vi.stubEnv('HOME', gitHome);
  vi.stubEnv('USERPROFILE', gitHome);
  vi.stubEnv('XDG_CONFIG_HOME', gitHome);
  vi.stubEnv('GIT_CONFIG_GLOBAL', globalConfiguration);
  vi.stubEnv('GIT_CONFIG_SYSTEM', systemConfiguration);
  git(worktree, 'init', '--quiet', '--initial-branch=main');
  git(worktree, 'config', 'core.autocrlf', 'false');
  writeFileSync(join(worktree, '.gitignore'), 'node_modules/\ndist/\n.env.local\n');
  writeFileSync(join(worktree, 'kept.txt'), 'original\n');
  writeFileSync(join(worktree, 'removed.txt'), 'remove me\n');
  writeFileSync(join(worktree, 'renamed-from.txt'), 'stable content\n');
  git(worktree, 'add', '--all');
  git(worktree, 'commit', '--quiet', '--message', 'initial');
  return worktree;
}

async function snapshot(worktree: string): Promise<{
  readonly paths: readonly string[];
  readonly hash: string;
  readonly headCommit: string;
  readonly excludedPaths: readonly string[];
  readonly deletedPaths: readonly string[];
}> {
  const outputDirectory = mkdtempSync(join(tmpdir(), 'worktree-snapshot-out-'));
  temporaryDirectories.push(outputDirectory);
  const result = await createWorktreeSnapshot({
    worktreePath: worktree,
    outputDirectory,
    signal: new AbortController().signal,
  });
  const listing = execFileSync('tar', ['-tzf', basename(result.archivePath)], {
    cwd: dirname(result.archivePath),
    encoding: 'utf8',
  });
  return {
    paths: listing.split(/\r?\n/u).filter(Boolean).sort(),
    hash: result.hash,
    headCommit: result.headCommit,
    excludedPaths: result.excludedPaths,
    deletedPaths: result.deletedPaths,
  };
}

// Every case runs several real Git processes, which take seconds each on Windows runners.
describe('createWorktreeSnapshot', { timeout: 30_000 }, () => {
  it('captures uncommitted modifications, additions, deletions, and renames', async () => {
    // arrange
    const worktree = createRepository();
    writeFileSync(join(worktree, 'kept.txt'), 'modified in the worktree\n');
    rmSync(join(worktree, 'removed.txt'));
    git(worktree, 'mv', 'renamed-from.txt', 'renamed-to.txt');
    writeFileSync(join(worktree, 'added.txt'), 'brand new\n');

    // act
    const result = await snapshot(worktree);

    // assert
    expect(result.paths).toContain('kept.txt');
    expect(result.paths).toContain('added.txt');
    expect(result.paths).toContain('renamed-to.txt');
    expect(result.paths).not.toContain('renamed-from.txt');
    expect(result.paths).not.toContain('removed.txt');
    expect(result.deletedPaths).toContain('removed.txt');
    expect(result.headCommit).toMatch(/^[0-9a-f]{40}$/u);
  });

  it('captures an unstaged rename as the new path only', async () => {
    // arrange
    const worktree = createRepository();
    renameSync(join(worktree, 'renamed-from.txt'), join(worktree, 'moved-by-hand.txt'));

    // act
    const result = await snapshot(worktree);

    // assert
    expect(result.paths).toContain('moved-by-hand.txt');
    expect(result.paths).not.toContain('renamed-from.txt');
    expect(result.deletedPaths).toContain('renamed-from.txt');
  });

  it('never transfers credentials, ignored environment files, or rebuilt directories', async () => {
    // arrange
    const worktree = createRepository();
    mkdirSync(join(worktree, 'node_modules', 'left-pad'), { recursive: true });
    mkdirSync(join(worktree, 'dist'), { recursive: true });
    mkdirSync(join(worktree, 'e2e', 'test-results'), { recursive: true });
    mkdirSync(join(worktree, '.nx', 'cache'), { recursive: true });
    writeFileSync(join(worktree, 'node_modules', 'left-pad', 'index.js'), 'module.exports = 1;\n');
    writeFileSync(join(worktree, 'dist', 'main.js'), 'built\n');
    writeFileSync(join(worktree, 'e2e', 'test-results', 'stale.png'), 'old run\n');
    writeFileSync(join(worktree, '.nx', 'cache', 'entry.json'), '{}\n');
    writeFileSync(join(worktree, '.env.local'), 'DATABASE_URL=postgres://secret\n');
    writeFileSync(join(worktree, '.npmrc'), '//registry.npmjs.org/:_authToken=secret\n');
    writeFileSync(join(worktree, 'server.key'), 'PRIVATE KEY\n');
    git(worktree, 'add', '--force', '.npmrc', 'server.key');

    const result = await snapshot(worktree);

    // act
    const transferred = result.paths.join('\n');
    // assert
    expect(transferred).not.toContain('node_modules');
    expect(transferred).not.toContain('dist/');
    expect(transferred).not.toContain('test-results');
    expect(transferred).not.toContain('.nx/cache');
    expect(transferred).not.toContain('.env.local');
    expect(transferred).not.toContain('.npmrc');
    expect(transferred).not.toContain('server.key');
    expect(transferred).not.toContain('.git/');
    expect(result.excludedPaths).toEqual(expect.arrayContaining(['.npmrc', 'server.key']));
  });

  it('produces a stable hash that changes with content and returns after a revert', async () => {
    // arrange
    const worktree = createRepository();
    const original = await snapshot(worktree);
    // act
    const repeated = await snapshot(worktree);
    // assert
    expect(repeated.hash).toBe(original.hash);

    writeFileSync(join(worktree, 'kept.txt'), 'changed\n');
    const changed = await snapshot(worktree);
    expect(changed.hash).not.toBe(original.hash);

    writeFileSync(join(worktree, 'kept.txt'), 'original\n');
    const reverted = await snapshot(worktree);
    expect(reverted.hash).toBe(original.hash);
  });

  it('creates a local tar archive without treating an absolute drive path as a remote host', async () => {
    // arrange
    const worktree = createRepository();
    const directory = mkdtempSync(join(tmpdir(), 'worktree-snapshot-out-'));
    temporaryDirectories.push(directory);
    const outputDirectory = relative(process.cwd(), directory);
    const execute = vi.fn(defaultExecute);

    // act
    const result = await createWorktreeSnapshot({
      worktreePath: worktree,
      outputDirectory,
      execute,
      signal: new AbortController().signal,
    });

    // assert: archive grammar stays local even when the output directory has a Windows drive.
    const tar = execute.mock.calls.find(([executable]) => executable === 'tar');
    if (!tar) throw new Error('The snapshot did not invoke tar.');
    const arguments_ = tar[1];
    const archive = arguments_[arguments_.indexOf('-czf') + 1];
    if (!archive) throw new Error('The snapshot did not specify an archive destination.');
    expect(isAbsolute(archive)).toBe(false);
    expect(archive).not.toContain(':');
    expect(resolve(tar[2], archive)).toBe(resolve(result.archivePath));
    expect(execFileSync('tar', ['-tzf', archive], { cwd: tar[2], encoding: 'utf8' })).toContain(
      'kept.txt',
    );
    const extracted = mkdtempSync(join(tmpdir(), 'worktree-snapshot-extracted-'));
    temporaryDirectories.push(extracted);
    execFileSync('tar', ['-xzf', archive, '-C', extracted], { cwd: tar[2] });
    expect(readFileSync(join(extracted, 'kept.txt'), 'utf8')).toBe('original\n');
  });

  it('rejects a path that is not a Git worktree', async () => {
    // arrange
    const directory = mkdtempSync(join(tmpdir(), 'worktree-snapshot-plain-'));
    temporaryDirectories.push(directory);
    // act
    writeFileSync(join(directory, 'file.txt'), 'content\n');

    // assert
    await expect(snapshot(directory)).rejects.toThrow(/not a Git worktree/u);
  });
});
