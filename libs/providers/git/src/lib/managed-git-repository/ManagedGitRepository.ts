// #region Imports

import type { IRepositoryAcquisitionPort } from '@symphony/application-workspace';
import type { IPreparedRepository, IRepositoryBinding } from '@symphony/domain-workspace';
import { existsSync, mkdirSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { resolveAllowedCommand } from '@symphony/providers-core';
import { toolchainSearchPath } from '@symphony/providers-core';
import type { IManagedGitRepositoryOptions } from './IManagedGitRepositoryOptions';
import { managedRepositoryDirectoryName } from './managedRepositoryDirectoryName';
import { execFileAsync } from '@symphony/providers-core';

// #endregion

export class ManagedGitRepository implements IRepositoryAcquisitionPort {
  // #region Ctor

  public constructor(private readonly _options: IManagedGitRepositoryOptions) {}

  // #endregion

  // #region Methods

  /**
   * Inspects.
   *
   * @param repository - Repository.
   * @param managedRoot - Managed root.
   * @public
   */
  public async inspect(
    repository: IRepositoryBinding,
    managedRoot: string,
  ): Promise<IPreparedRepository | undefined> {
    if (!repository.localPath || !existsSync(repository.localPath)) return undefined;
    const sourcePath = realpathSync(repository.localPath);
    const repositoryRoot = await this.gitOutput(sourcePath, ['rev-parse', '--show-toplevel']);
    let remote: string | undefined;
    try {
      remote = await this.gitOutput(repositoryRoot, ['remote', 'get-url', 'origin']);
    } catch {
      // A user-selected local repository can be valid before an origin is configured.
    }
    if (remote && !matchesRepository(remote, repository)) {
      throw new Error(
        `The configured folder does not belong to ${repository.owner}/${repository.name}.`,
      );
    }
    const revision = await this.resolveRevision(repositoryRoot, repository.defaultBranch);
    const resolvedManagedRoot = resolve(managedRoot);
    const resolvedRepositoryRoot = resolve(repositoryRoot);
    return {
      path: resolvedRepositoryRoot,
      revision,
      managed: dirname(resolvedRepositoryRoot) === resolvedManagedRoot,
    };
  }

  /**
   * Prepares.
   *
   * @param repository - Repository.
   * @param managedRoot - Managed root.
   * @param signal - Signal.
   * @public
   */
  public async prepare(
    repository: IRepositoryBinding,
    managedRoot: string,
    signal: AbortSignal,
  ): Promise<IPreparedRepository> {
    if (signal.aborted) throw new Error('Repository preparation was cancelled.');
    const existing = await this.inspect(repository, managedRoot);
    if (existing) {
      await this.fetch(repository, existing.path, signal);
      return (await this.inspect({ ...repository, localPath: existing.path }, managedRoot))!;
    }

    mkdirSync(managedRoot, { recursive: true, mode: 0o700 });
    const targetPath = join(resolve(managedRoot), managedRepositoryDirectoryName(repository));
    if (dirname(targetPath) !== resolve(managedRoot)) {
      throw new Error('The managed repository path escaped its configured root.');
    }
    if (existsSync(targetPath)) {
      const prepared = await this.inspect({ ...repository, localPath: targetPath }, managedRoot);
      if (!prepared) throw new Error(`The managed repository path is unavailable: ${targetPath}`);
      await this.fetch(repository, prepared.path, signal);
      return (await this.inspect({ ...repository, localPath: prepared.path }, managedRoot))!;
    }

    const token = await this._options.token(repository);
    if (!token)
      throw new Error(`Sign in to GitHub for ${repository.host} before preparing this repository.`);
    const hooksPath = join(resolve(managedRoot), '.disabled-hooks');
    mkdirSync(hooksPath, { recursive: true, mode: 0o700 });
    const repositoryName =
      repository.host.toLowerCase() === 'github.com'
        ? `${repository.owner}/${repository.name}`
        : `${repository.host}/${repository.owner}/${repository.name}`;
    await execFileAsync(
      resolveAllowedCommand('gh'),
      [
        'repo',
        'clone',
        repositoryName,
        targetPath,
        '--',
        '--no-checkout',
        '--config',
        `core.hooksPath=${hooksPath}`,
      ],
      {
        encoding: 'utf8',
        env: githubEnvironment(repository, token),
        maxBuffer: MAX_GIT_OUTPUT_BYTES,
        signal,
        timeout: 5 * 60_000,
      },
    );
    await this.fetch(repository, targetPath, signal);
    const prepared = await this.inspect({ ...repository, localPath: targetPath }, managedRoot);
    if (!prepared) throw new Error('The managed repository clone could not be verified.');
    return prepared;
  }

  private async fetch(
    repository: IRepositoryBinding,
    repositoryPath: string,
    signal: AbortSignal,
  ): Promise<void> {
    const token = await this._options.token(repository);
    if (!token)
      throw new Error(
        `Sign in to GitHub for ${repository.host} before refreshing this repository.`,
      );
    const gh = resolveAllowedCommand('gh');
    await execFileAsync(
      resolveAllowedCommand('git'),
      [
        '-c',
        'credential.helper=',
        '-c',
        `credential.helper=!${gh} auth git-credential`,
        '-C',
        repositoryPath,
        'fetch',
        '--prune',
        'origin',
        `+refs/heads/${repository.defaultBranch}:refs/remotes/origin/${repository.defaultBranch}`,
      ],
      {
        encoding: 'utf8',
        env: githubEnvironment(repository, token),
        maxBuffer: MAX_GIT_OUTPUT_BYTES,
        signal,
        timeout: 5 * 60_000,
      },
    );
  }

  private async resolveRevision(repositoryRoot: string, defaultBranch: string): Promise<string> {
    for (const candidate of [
      `refs/remotes/origin/${defaultBranch}`,
      `refs/heads/${defaultBranch}`,
      'HEAD',
    ]) {
      try {
        return await this.gitOutput(repositoryRoot, [
          'rev-parse',
          '--verify',
          `${candidate}^{commit}`,
        ]);
      } catch {
        // Try the next local revision without changing repository state.
      }
    }
    throw new Error(`No local commit is available for ${defaultBranch}.`);
  }

  private async gitOutput(repositoryPath: string, arguments_: readonly string[]): Promise<string> {
    const { stdout } = await execFileAsync(
      resolveAllowedCommand('git'),
      ['-C', repositoryPath, ...arguments_],
      { encoding: 'utf8', maxBuffer: MAX_GIT_OUTPUT_BYTES, timeout: 30_000 },
    );
    return stdout.trim();
  }

  // #endregion
}

const MAX_GIT_OUTPUT_BYTES = 4 * 1024 * 1024;

function matchesRepository(remote: string, repository: IRepositoryBinding): boolean {
  const normalized = remote
    .trim()
    .replace(/\.git$/iu, '')
    .replace(/\/$/u, '')
    .toLowerCase();
  return [
    `https://${repository.host}/${repository.owner}/${repository.name}`,
    `ssh://git@${repository.host}/${repository.owner}/${repository.name}`,
    `git@${repository.host}:${repository.owner}/${repository.name}`,
  ]
    .map((candidate) => candidate.toLowerCase())
    .includes(normalized);
}

function githubEnvironment(repository: IRepositoryBinding, token: string): NodeJS.ProcessEnv {
  const environment: NodeJS.ProcessEnv = {
    GH_TOKEN: token,
    GITHUB_TOKEN: token,
    GH_HOST: repository.host,
    GIT_TERMINAL_PROMPT: '0',
    GIT_LFS_SKIP_SMUDGE: '1',
  };
  for (const name of ['HOME', 'LANG', 'LC_ALL', 'SHELL', 'TMPDIR'] as const) {
    if (process.env[name]) environment[name] = process.env[name];
  }
  environment['PATH'] = toolchainSearchPath();
  return environment;
}
