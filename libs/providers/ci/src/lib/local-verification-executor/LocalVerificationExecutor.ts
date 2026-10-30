// #region Imports

import type { IVerificationExecutorPort } from '@symphony/application-ci';
import type { IVerificationStep, IVerificationStepResult } from '@symphony/domain-ci';
import { accessSync, constants, mkdirSync, realpathSync, rmSync } from 'node:fs';
import {
  releaseSandboxTemporaryDirectory,
  resolveToolchainExecutable,
  sandboxTemporaryDirectory,
  toolchainCacheEnvironment,
  toolchainSearchPath,
} from '@symphony/providers-core';
import { isAbsolute, join, relative, resolve } from 'node:path';
import { spawn } from 'node:child_process';
import { ALLOWED_EXECUTABLES } from './AllowedExecutables';
import { ALLOWED_REPOSITORY_EXECUTABLES } from './AllowedRepositoryExecutables';
import type { ILocalVerificationExecutorOptions } from './ILocalVerificationExecutorOptions';
import { MAX_STEP_OUTPUT_BYTES } from './MaxStepOutputBytes';
import { TERMINATION_GRACE_MS } from './TerminationGraceMs';
import { argumentsAllowed } from './argumentsAllowed';

// #endregion

export class LocalVerificationExecutor implements IVerificationExecutorPort {
  // #region Ctor

  public constructor(private readonly _options: ILocalVerificationExecutorOptions = {}) {}

  // #endregion

  // #region Methods

  /**
   * Executes.
   *
   * @param workspacePath - Workspace path.
   * @param runtimePath - Runtime path.
   * @param steps - Steps.
   * @param signal - Signal.
   * @public
   */
  public async execute(
    workspacePath: string,
    runtimePath: string,
    steps: readonly IVerificationStep[],
    signal: AbortSignal,
  ): Promise<readonly IVerificationStepResult[]> {
    const workspaceRoot = realpathSync(workspacePath);
    mkdirSync(runtimePath, { recursive: true, mode: 0o700 });
    const temporaryDirectory = sandboxTemporaryDirectory(runtimePath);
    const results: IVerificationStepResult[] = [];
    try {
      for (const step of steps) {
        if (signal.aborted) break;
        const result = await this.executeStep(
          workspaceRoot,
          runtimePath,
          temporaryDirectory,
          step,
          signal,
        );
        results.push(result);
        if (result.state !== 'succeeded') break;
      }
      return results;
    } finally {
      rmSync(runtimePath, { force: true, recursive: true });
      releaseSandboxTemporaryDirectory(temporaryDirectory);
    }
  }

  private async executeStep(
    workspaceRoot: string,
    runtimePath: string,
    temporaryDirectory: string,
    step: IVerificationStep,
    signal: AbortSignal,
  ): Promise<IVerificationStepResult> {
    validateStep(step);
    const workingDirectory = resolve(workspaceRoot, step.workingDirectory);
    const relativeWorkingDirectory = relative(workspaceRoot, workingDirectory);
    if (relativeWorkingDirectory.startsWith('..') || isAbsolute(relativeWorkingDirectory)) {
      throw new Error(`Verification step ${step.id} escaped the managed worktree.`);
    }
    const startedAt = new Date().toISOString();
    const environment = verificationEnvironment(
      runtimePath,
      temporaryDirectory,
      this._options.cacheRoot,
      this._options.environment ?? process.env,
    );
    const executable = this.executablePath(workspaceRoot, workingDirectory, step, environment);
    if (!executable) {
      return {
        stepId: step.id,
        state: 'failed',
        startedAt,
        finishedAt: new Date().toISOString(),
        output: `${step.executable} was not found. Install it, or make it available to Symphony, and run this verification again.`,
      };
    }
    const child = spawn(executable, [...step.arguments], {
      cwd: workingDirectory,
      env: environment,
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
      detached: process.platform !== 'win32',
      windowsHide: true,
    });
    let output = '';
    let outputBytes = 0;
    let outputExceeded = false;
    // A step that prints more than the retained buffer is noisy, not broken. Stop recording once
    // the buffer is full and let the step finish, so its own exit code decides the outcome.
    const collect = (chunk: Buffer): void => {
      if (outputExceeded) return;
      outputBytes += chunk.byteLength;
      if (outputBytes > MAX_STEP_OUTPUT_BYTES) {
        outputExceeded = true;
        return;
      }
      output += chunk.toString('utf8');
    };
    child.stdout.on('data', collect);
    child.stderr.on('data', collect);

    let timedOut = false;
    const timeout = setTimeout(() => {
      timedOut = true;
      terminate(child.pid);
    }, step.timeoutSeconds * 1_000);
    timeout.unref();
    const abort = (): void => terminate(child.pid);
    signal.addEventListener('abort', abort, { once: true });
    let startFailure: string | undefined;
    const exitCode = await new Promise<number | null>((resolveExit) => {
      // A process that never starts is a missing or unusable toolchain, not a crashed run.
      child.once('error', (cause: Error) => {
        startFailure = cause.message;
        resolveExit(null);
      });
      child.once('close', resolveExit);
    }).finally(() => {
      clearTimeout(timeout);
      signal.removeEventListener('abort', abort);
    });
    const suffix = startFailure
      ? `${output ? '\n\n' : ''}${step.executable} could not be started: ${startFailure}`
      : outputExceeded
        ? `\n\n… output truncated after ${MAX_STEP_OUTPUT_BYTES / (1024 * 1024)} MB. The step itself ran to completion.`
        : timedOut
          ? `\n\nTimed out after ${step.timeoutSeconds} seconds.`
          : '';
    return {
      stepId: step.id,
      state: signal.aborted
        ? 'cancelled'
        : exitCode === 0 && !timedOut && !startFailure
          ? 'succeeded'
          : 'failed',
      startedAt,
      finishedAt: new Date().toISOString(),
      ...(typeof exitCode === 'number' ? { exitCode } : {}),
      output: redact(`${output}${suffix}`),
    };
  }

  /**
   * Repository wrappers stay inside the worktree. Everything else is resolved to an absolute path,
   * because a desktop-launched Symphony does not inherit the PATH of the user's terminal.
   */
  private executablePath(
    workspaceRoot: string,
    workingDirectory: string,
    step: IVerificationStep,
    environment: NodeJS.ProcessEnv,
  ): string | undefined {
    if (ALLOWED_REPOSITORY_EXECUTABLES.has(step.executable)) {
      return repositoryExecutable(workspaceRoot, workingDirectory, step.executable);
    }
    const resolver = this._options.resolveExecutable ?? resolveToolchainExecutable;
    return resolver(step.executable, environment);
  }

  // #endregion
}

function validateStep(step: IVerificationStep): void {
  if (
    !ALLOWED_EXECUTABLES.has(step.executable) &&
    !ALLOWED_REPOSITORY_EXECUTABLES.has(step.executable)
  ) {
    throw new Error(`Verification executable is not allowed: ${step.executable}`);
  }
  if (!/^[a-zA-Z0-9._-]+$/u.test(step.id)) {
    throw new Error('Verification step identifiers must be filesystem-safe.');
  }
  if (
    !Number.isInteger(step.timeoutSeconds) ||
    step.timeoutSeconds < 1 ||
    step.timeoutSeconds > 3_600
  ) {
    throw new Error(`Verification step ${step.id} has an invalid timeout.`);
  }
  if (step.arguments.some((argument) => argument.includes('\0') || argument.length > 4_096)) {
    throw new Error(`Verification step ${step.id} has invalid arguments.`);
  }
  if (!argumentsAllowed(step.executable, step.arguments)) {
    throw new Error(`Verification arguments are not allowed for ${step.executable}.`);
  }
}

function repositoryExecutable(
  workspaceRoot: string,
  workingDirectory: string,
  executable: string,
): string {
  const path = resolve(workingDirectory, executable);
  const relativePath = relative(workspaceRoot, path);
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new Error('Repository executable escaped the managed worktree.');
  }
  accessSync(path, constants.X_OK);
  return path;
}

function verificationEnvironment(
  runtimePath: string,
  temporary: string,
  cacheRoot: string | undefined,
  source: NodeJS.ProcessEnv,
): NodeJS.ProcessEnv {
  const persistentRoot = cacheRoot ?? runtimePath;
  const home = join(persistentRoot, 'home');
  const cache = join(persistentRoot, 'cache');
  for (const path of [home, cache]) mkdirSync(path, { recursive: true, mode: 0o700 });
  const environment: NodeJS.ProcessEnv = {
    ...toolchainCacheEnvironment(persistentRoot),
    HOME: home,
    TMPDIR: temporary,
    CI: 'true',
    GIT_TERMINAL_PROMPT: '0',
    PATH: toolchainSearchPath(source),
  };
  if (process.platform === 'win32') {
    // Native Windows tools use these instead of HOME/TMPDIR. Keep their data inside the same
    // private runtime as Unix toolchains rather than falling back to the operator's profile.
    const roaming = join(home, 'AppData', 'Roaming');
    const local = join(home, 'AppData', 'Local');
    for (const path of [roaming, local]) mkdirSync(path, { recursive: true, mode: 0o700 });
    environment['USERPROFILE'] = home;
    environment['APPDATA'] = roaming;
    environment['LOCALAPPDATA'] = local;
    environment['TEMP'] = temporary;
    environment['TMP'] = temporary;
  }
  for (const name of ['LANG', 'LC_ALL', 'SHELL'] as const) {
    if (source[name]) environment[name] = source[name];
  }
  return environment;
}

function terminate(pid: number | undefined): void {
  if (!pid) return;
  try {
    process.kill(process.platform === 'win32' ? pid : -pid, 'SIGTERM');
  } catch {
    return;
  }
  const timer = setTimeout(() => {
    try {
      process.kill(process.platform === 'win32' ? pid : -pid, 'SIGKILL');
    } catch {
      // The process group already exited.
    }
  }, TERMINATION_GRACE_MS);
  timer.unref();
}

function redact(value: string): string {
  const redacted = value
    .replace(/\b(?:github_pat_|gh[pousr]_)[a-zA-Z0-9_]{16,}\b/gu, '[redacted]')
    .replace(/\bsk-[a-zA-Z0-9_-]{16,}\b/gu, '[redacted]')
    .replace(
      /((?:api[_-]?key|password|secret|token)\s*[:=]\s*)(?:"[^"]*"|'[^']*'|[^\s]+)/giu,
      '$1[redacted]',
    )
    .replace(/(authorization\s*:\s*bearer\s+)[^\s]+/giu, '$1[redacted]');
  return redacted.length > MAX_STEP_OUTPUT_BYTES
    ? `${redacted.slice(0, MAX_STEP_OUTPUT_BYTES)}\n\n… output truncated.`
    : redacted;
}
