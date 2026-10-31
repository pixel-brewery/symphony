// #region Imports

import type { IExternalWriteOperation } from '@symphony/domain-ci';
import type { IExternalWriteRepository } from '@symphony/application-ci';
import { mkdirSync, readFileSync, existsSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';

// #endregion

/**
 * Atomic, validated provider intent journal.
 *
 * @public
 */
export class JsonExternalWriteRepository implements IExternalWriteRepository {
  // #region Ctor
  /**
   * Performs the existing journal operation.
   *
   * @public
   */
  public constructor(
    private readonly _path: string,
    private readonly _parse: (value: unknown) => readonly IExternalWriteOperation[],
  ) {}
  // #endregion
  // #region Methods
  /**
   * Performs the existing journal operation.
   *
   * @public
   */
  public list(): readonly IExternalWriteOperation[] {
    return existsSync(this._path) ? this._parse(JSON.parse(readFileSync(this._path, 'utf8'))) : [];
  }
  /**
   * Performs the existing journal operation.
   *
   * @public
   */
  public save(operation: IExternalWriteOperation): void {
    const records = this.list().filter((item) => item.id !== operation.id);
    mkdirSync(dirname(this._path), { recursive: true, mode: 0o700 });
    const path = `${this._path}.${randomUUID()}.tmp`;
    writeFileSync(path, JSON.stringify([...records, operation]), { mode: 0o600 });
    renameSync(path, this._path);
  }
  // #endregion
}
