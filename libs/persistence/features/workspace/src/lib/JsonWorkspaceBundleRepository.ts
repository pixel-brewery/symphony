// #region Imports

import { randomUUID } from 'node:crypto';
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { basename, join } from 'node:path';

// #endregion

const MAX_BUNDLE_BYTES = 32 * 1024 * 1024;

/**
 * Owns the existing validated filesystem boundary for workspace JSON bundles.
 *
 * @public
 */
export class JsonWorkspaceBundleRepository {
  // #region Methods

  /**
   * Returns the read.
   *
   * @param sourcePath - Source path.
   * @public
   */
  public read(sourcePath: string): unknown {
    const path = this.expandHome(sourcePath);
    let stat;
    try {
      stat = lstatSync(path);
    } catch (cause) {
      throw new Error(`Unable to inspect workspace bundle: ${this.causeMessage(cause)}`, { cause });
    }
    if (stat.isSymbolicLink() || !stat.isFile()) {
      throw new Error('Workspace import requires a regular JSON file, not a link or directory.');
    }
    if (stat.size > MAX_BUNDLE_BYTES) {
      throw new Error('Workspace bundle exceeds the 32 MB safety limit.');
    }
    try {
      return JSON.parse(readFileSync(path, 'utf8')) as unknown;
    } catch (cause) {
      throw new Error(`Unable to read workspace bundle: ${this.causeMessage(cause)}`, { cause });
    }
  }

  /**
   * Returns the write.
   *
   * @param destinationRoot - Destination root.
   * @param fileName - File name.
   * @param value - Value.
   * @public
   */
  public write(destinationRoot: string, fileName: string, value: unknown): string {
    if (basename(fileName) !== fileName || !fileName.endsWith('.symphony-workspace.json')) {
      throw new Error('Invalid workspace bundle file name.');
    }
    const root = this.expandHome(destinationRoot);
    mkdirSync(root, { recursive: true, mode: 0o700 });
    const rootStat = lstatSync(root);
    if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
      throw new Error('Workspace export destination must be a regular directory.');
    }
    const target = join(root, fileName);
    if (existsSync(target)) throw new Error(`Workspace export target already exists: ${target}`);
    const temporary = join(root, `.${fileName}.${process.pid}.${randomUUID()}.tmp`);
    const serialized = `${JSON.stringify(value, null, 2)}\n`;
    if (Buffer.byteLength(serialized) > MAX_BUNDLE_BYTES) {
      throw new Error('Workspace bundle exceeds the 32 MB safety limit.');
    }
    try {
      writeFileSync(temporary, serialized, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
      renameSync(temporary, target);
      chmodSync(target, 0o600);
      return target;
    } catch (cause) {
      rmSync(temporary, { force: true });
      throw new Error(`Unable to export workspace bundle: ${this.causeMessage(cause)}`, { cause });
    }
  }

  private expandHome(path: string): string {
    return path.startsWith('~/') ? join(homedir(), path.slice(2)) : path;
  }

  private causeMessage(cause: unknown): string {
    return cause instanceof Error ? cause.message : 'unknown file-system error';
  }

  // #endregion
}
