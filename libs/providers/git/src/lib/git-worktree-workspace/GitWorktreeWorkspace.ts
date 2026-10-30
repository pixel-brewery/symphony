// #region Imports

import type {
  IPreparedWorkspace,
  IWorkspaceChangeSet,
  IWorkspacePort,
  WorkspacePurpose,
} from '@symphony/application-workspace';
import type { IVerificationWorkspacePort } from '@symphony/application-ci';
import type { IRepositoryBinding } from '@symphony/domain-workspace';
import type { IWorkItem } from '@symphony/domain-work';
import { existsSync, lstatSync, mkdirSync, readdirSync, realpathSync, rmSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { resolveAllowedCommand } from '@symphony/providers-core';
import type { IGitWorktreeWorkspaceOptions } from './IGitWorktreeWorkspaceOptions';
import { execFileAsync } from '@symphony/providers-core';

// #endregion

export class GitWorktreeWorkspace implements IWorkspacePort, IVerificationWorkspacePort {
  // #region Ctor

  public constructor(private readonly _options: IGitWorktreeWorkspaceOptions) {}

  // #endregion

  // #region Methods

  /**
   * Prepares.
   *
   * @param executionId - Execution id.
   * @param workItem - Work item.
   * @param purpose - Purpose.
   * @public
   */
  public async prepare(
    executionId: string,
    workItem: IWorkItem,
    purpose: WorkspacePurpose,
  ): Promise<IPreparedWorkspace> {
    if (!/^[a-zA-Z0-9._-]+$/.test(executionId)) {
      throw new Error('The execution identifier cannot be used as a workspace directory.');
    }

    const repository = this.resolveRepository(workItem);
    if (!repository) throw new Error('Choose a repository before starting an analysis.');
    if (!existsSync(repository.localPath)) {
      throw new Error(`The configured repository folder does not exist: ${repository.localPath}`);
    }

    const sourcePath = realpathSync(repository.localPath);
    const repositoryRoot = await this.gitOutput(sourcePath, ['rev-parse', '--show-toplevel']);
    const workspaceRoot = resolve(this._options.workspaceRoot(workItem.workspaceId));
    mkdirSync(workspaceRoot, { recursive: true, mode: 0o700 });
    const workspacePath = join(workspaceRoot, executionId);
    if (dirname(workspacePath) !== workspaceRoot) {
      throw new Error('The managed workspace path escaped its configured root.');
    }
    if (existsSync(workspacePath)) {
      throw new Error(`The managed workspace already exists: ${workspacePath}`);
    }

    const revision = await this.resolveRevision(repositoryRoot, repository.defaultBranch);
    const reference =
      purpose === 'implementation'
        ? await this.resolveImplementationBranch(repositoryRoot, workItem, executionId)
        : undefined;
    await execFileAsync(
      resolveAllowedCommand('git'),
      reference
        ? ['-C', repositoryRoot, 'worktree', 'add', '-b', reference, workspacePath, revision]
        : ['-C', repositoryRoot, 'worktree', 'add', '--detach', workspacePath, revision],
      { encoding: 'utf8' },
    );
    return { path: workspacePath, ...(reference ? { reference } : {}) };
  }

  /**
   * Returns the preserve.
   *
   * @param path - Path.
   * @public
   */
  public async preserve(path: string): Promise<void> {
    if (!path || !existsSync(path)) return;
    realpathSync(path);
  }

  /**
   * Prepares the verification.
   *
   * @param executionId - Execution id.
   * @param repository - Repository.
   * @param revision - Revision.
   * @public
   */
  public async prepareVerification(
    executionId: string,
    repository: IRepositoryBinding,
    revision: string,
  ): Promise<string> {
    if (!/^[a-zA-Z0-9._-]+$/.test(executionId)) {
      throw new Error('The verification identifier cannot be used as a workspace directory.');
    }
    if (!existsSync(repository.localPath)) {
      throw new Error(`The configured repository folder does not exist: ${repository.localPath}`);
    }
    const repositoryRoot = await this.gitOutput(realpathSync(repository.localPath), [
      'rev-parse',
      '--show-toplevel',
    ]);
    await this.gitOutput(repositoryRoot, ['rev-parse', '--verify', `${revision}^{commit}`]);
    const workspaceRoot = resolve(this._options.workspaceRoot(repository.workspaceId));
    mkdirSync(workspaceRoot, { recursive: true, mode: 0o700 });
    const workspacePath = join(workspaceRoot, `execution-${executionId}`);
    if (dirname(workspacePath) !== workspaceRoot || existsSync(workspacePath)) {
      throw new Error('The managed verification workspace is unavailable.');
    }
    await execFileAsync(
      resolveAllowedCommand('git'),
      ['-C', repositoryRoot, 'worktree', 'add', '--detach', workspacePath, revision],
      { encoding: 'utf8' },
    );
    return workspacePath;
  }

  /**
   * Whether it is available.
   *
   * @param path - Path.
   * @public
   */
  public async isAvailable(path: string): Promise<boolean> {
    try {
      const workspacePath = this.validateManagedPath(path);
      return existsSync(workspacePath) && existsSync(join(workspacePath, '.git'));
    } catch {
      return false;
    }
  }

  /**
   * Inspects the changes.
   *
   * @param path - Path.
   * @public
   */
  public async inspectChanges(path: string): Promise<IWorkspaceChangeSet> {
    const workspacePath = this.validateManagedPath(path);
    if (!existsSync(workspacePath)) return { changedFiles: [], diffLines: 0 };
    const [tracked, untracked, numstat] = await Promise.all([
      this.gitOutput(workspacePath, ['diff', '--name-only', 'HEAD', '--']),
      this.gitOutput(workspacePath, ['ls-files', '--others', '--exclude-standard']),
      this.gitOutput(workspacePath, ['diff', '--numstat', 'HEAD', '--']),
    ]);
    const changedFiles = [
      ...new Set(
        `${tracked}\n${untracked}`
          .split(/\r?\n/u)
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ].sort();
    const diffLines = numstat
      .split(/\r?\n/u)
      .filter(Boolean)
      .reduce((total, row) => {
        const [added, removed] = row.split('\t', 3);
        const additions = Number(added);
        const deletions = Number(removed);
        return (
          total +
          (Number.isFinite(additions) ? additions : 0) +
          (Number.isFinite(deletions) ? deletions : 0)
        );
      }, 0);
    return { changedFiles, diffLines };
  }

  /**
   * Lists the managed.
   *
   * @param workspaceId - Workspace id.
   * @public
   */
  public async listManaged(workspaceId?: string): Promise<readonly string[]> {
    return this.managedRoots(workspaceId).flatMap((workspaceRoot) => {
      if (!existsSync(workspaceRoot)) return [];
      const realWorkspaceRoot = realpathSync(workspaceRoot);
      return readdirSync(realWorkspaceRoot, { withFileTypes: true })
        .filter(
          (entry) =>
            entry.isDirectory() &&
            !entry.isSymbolicLink() &&
            /^execution-[a-zA-Z0-9._-]+$/.test(entry.name),
        )
        .map((entry) => join(realWorkspaceRoot, entry.name));
    });
  }

  /**
   * Releases.
   *
   * @param path - Path.
   * @public
   */
  public async release(path: string): Promise<boolean> {
    const workspacePath = this.validateManagedPath(path);
    if (!existsSync(workspacePath)) return false;
    if (lstatSync(workspacePath).isSymbolicLink()) {
      throw new Error('A symbolic link cannot be released as a managed workspace.');
    }

    const realWorkspaceRoot = realpathSync(dirname(workspacePath));
    const realWorkspacePath = realpathSync(workspacePath);
    if (dirname(realWorkspacePath) !== realWorkspaceRoot) {
      throw new Error('The managed workspace path escaped its configured root.');
    }

    if (!existsSync(join(realWorkspacePath, '.git'))) {
      rmSync(realWorkspacePath, { recursive: true, force: true });
      return true;
    }

    try {
      const { stdout } = await execFileAsync(
        resolveAllowedCommand('git'),
        ['-C', realWorkspacePath, 'rev-parse', '--path-format=absolute', '--git-common-dir'],
        { encoding: 'utf8' },
      );
      const commonDirectory = resolve(realWorkspacePath, stdout.trim());
      await execFileAsync(
        resolveAllowedCommand('git'),
        ['--git-dir', commonDirectory, 'worktree', 'remove', '--force', realWorkspacePath],
        { encoding: 'utf8' },
      );
      return true;
    } catch (cause) {
      const message =
        cause instanceof Error && 'stderr' in cause && typeof cause.stderr === 'string'
          ? cause.stderr.trim()
          : cause instanceof Error
            ? cause.message
            : 'Git command failed';
      throw new Error(`Unable to release the managed Git workspace: ${message}`, { cause });
    }
  }

  private validateManagedPath(path: string): string {
    const workspacePath = resolve(path);
    const workspaceName = basename(workspacePath);
    const managedRoots = this.managedRoots().map((root) => resolve(root));
    if (
      !managedRoots.includes(dirname(workspacePath)) ||
      !/^execution-[a-zA-Z0-9._-]+$/.test(workspaceName)
    ) {
      throw new Error('Only execution workspaces inside the configured root can be released.');
    }
    if (existsSync(workspacePath) && lstatSync(workspacePath).isSymbolicLink()) {
      throw new Error('A symbolic link cannot be used as a managed workspace.');
    }
    return workspacePath;
  }

  private managedRoots(workspaceId?: string): readonly string[] {
    if (workspaceId) return [resolve(this._options.workspaceRoot(workspaceId))];
    const workspaceIds = this._options.workspaceIds?.() ?? [];
    return workspaceIds.length
      ? workspaceIds.map((workspaceId) => resolve(this._options.workspaceRoot(workspaceId)))
      : [resolve(this._options.workspaceRoot())];
  }

  private async resolveRevision(repositoryRoot: string, defaultBranch: string): Promise<string> {
    const candidates = [
      `refs/heads/${defaultBranch}`,
      `refs/remotes/origin/${defaultBranch}`,
      'HEAD',
    ];
    for (const candidate of candidates) {
      try {
        await this.gitOutput(repositoryRoot, ['rev-parse', '--verify', `${candidate}^{commit}`]);
        return candidate;
      } catch {
        // Try the next local revision without accessing the network.
      }
    }
    throw new Error(`No local commit is available for ${defaultBranch}.`);
  }

  private async resolveImplementationBranch(
    repositoryRoot: string,
    workItem: IWorkItem,
    executionId: string,
  ): Promise<string> {
    const workItemNumber = workItem.externalId.replace(/[^0-9]/gu, '') || 'work';
    const slug = workItem.title
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/gu, '-')
      .replace(/^-+|-+$/gu, '')
      .slice(0, 48)
      .replace(/-+$/gu, '');
    const base = `codex/work-${workItemNumber}-${slug || 'implementation'}`;
    if (!(await this.localBranchExists(repositoryRoot, base))) return base;

    const executionSuffix = executionId
      .replace(/^execution-/u, '')
      .replace(/[^a-zA-Z0-9]/gu, '')
      .slice(0, 12)
      .toLowerCase();
    const unique = `${base}-${executionSuffix || 'retry'}`;
    if (!(await this.localBranchExists(repositoryRoot, unique))) return unique;
    throw new Error(`The implementation branch already exists: ${unique}`);
  }

  private async localBranchExists(repositoryRoot: string, branch: string): Promise<boolean> {
    try {
      await this.gitOutput(repositoryRoot, [
        'show-ref',
        '--verify',
        '--quiet',
        `refs/heads/${branch}`,
      ]);
      return true;
    } catch {
      return false;
    }
  }

  private async gitOutput(repositoryPath: string, arguments_: readonly string[]): Promise<string> {
    try {
      const { stdout } = await execFileAsync(
        resolveAllowedCommand('git'),
        ['-C', repositoryPath, ...arguments_],
        {
          encoding: 'utf8',
        },
      );
      return stdout.trim();
    } catch (cause) {
      const message =
        cause instanceof Error && 'stderr' in cause && typeof cause.stderr === 'string'
          ? cause.stderr.trim()
          : cause instanceof Error
            ? cause.message
            : 'Git command failed';
      throw new Error(`Unable to prepare the managed Git workspace: ${message}`, { cause });
    }
  }

  private resolveRepository(workItem: IWorkItem): IRepositoryBinding | undefined {
    return this._options.repository(workItem);
  }

  // #endregion
}
