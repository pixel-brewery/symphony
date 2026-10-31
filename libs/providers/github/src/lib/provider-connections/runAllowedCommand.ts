// #region Imports

import { spawn } from 'node:child_process';
import { resolveAllowedCommand } from '@symphony/providers-core';
import type { ICommandResult } from './ICommandResult';
import { githubCliEnvironment } from './githubCliEnvironment';

// #endregion

export async function runAllowedCommand(
  command: 'claude' | 'codex' | 'gh',
  args: readonly string[],
  input?: string,
  environment?: NodeJS.ProcessEnv,
  acceptedExitCodes: readonly number[] = [0],
): Promise<ICommandResult> {
  return new Promise((resolve, reject) => {
    const effectiveEnvironment =
      environment ?? (command === 'gh' ? githubCliEnvironment() : process.env);
    const child = spawn(resolveAllowedCommand(command, effectiveEnvironment), [...args], {
      env: effectiveEnvironment,
      stdio: ['pipe', 'pipe', 'pipe'],
      windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    const timeout = setTimeout(() => {
      child.kill('SIGTERM');
      reject(new Error(`${command} command timed out.`));
    }, 30_000);
    child.stdout.on('data', (chunk: Buffer) => {
      if (stdout.length < 16_777_216) stdout += chunk.toString();
    });
    child.stderr.on('data', (chunk: Buffer) => {
      if (stderr.length < 262_144) stderr += chunk.toString();
    });
    child.once('error', (error) => {
      clearTimeout(timeout);
      reject(error);
    });
    child.once('close', (code) => {
      clearTimeout(timeout);
      if (code !== null && acceptedExitCodes.includes(code)) {
        resolve({ stdout: stdout.trim(), stderr: stderr.trim() });
      } else {
        reject(new Error((stderr || stdout || `${command} exited with code ${code}`).trim()));
      }
    });
    if (input) child.stdin.end(`${input}\n`);
    else child.stdin.end();
  });
}
