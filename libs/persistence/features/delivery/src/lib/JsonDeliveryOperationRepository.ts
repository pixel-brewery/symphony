// #region Imports

import { mkdirSync, readFileSync, existsSync, writeFileSync, renameSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import type { IDeliveryOperationRepository } from '@symphony/application-delivery';
import type { IDeliveryOperation } from '@symphony/domain-delivery';

// #endregion

/**
 * Atomic local journal; load errors stop dispatch instead of losing duplicate protection.
 *
 * @public
 */
export class JsonDeliveryOperationRepository implements IDeliveryOperationRepository {
  // #region Ctor

  /**
   * Performs the existing journal operation.
   *
   * @public
   */
  public constructor(
    private readonly _path: string,
    private readonly _parse: (input: unknown) => readonly IDeliveryOperation[],
  ) {}

  // #endregion

  // #region Methods

  /**
   * Performs the existing journal operation.
   *
   * @public
   */
  public list(): readonly IDeliveryOperation[] {
    if (!existsSync(this._path)) return [];
    return this._parse(JSON.parse(readFileSync(this._path, 'utf8')));
  }

  /**
   * Performs the existing journal operation.
   *
   * @public
   */
  public save(operation: IDeliveryOperation): void {
    const records = this.list().filter((item) => item.id !== operation.id);
    mkdirSync(dirname(this._path), { recursive: true, mode: 0o700 });
    const temporary = `${this._path}.${randomUUID()}.tmp`;
    writeFileSync(temporary, JSON.stringify([...records, operation]), { mode: 0o600 });
    renameSync(temporary, this._path);
  }

  // #endregion
}
