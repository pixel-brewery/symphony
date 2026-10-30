// #region Imports

import { randomUUID } from 'node:crypto';
import { chmodSync, existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import type { IMobileAccessRepository } from '@symphony/application-mobile';
import {
  defaultPersistedMobileAccess,
  persistedMobileAccessSchema,
  type PersistedMobileAccess,
} from '@symphony/mobile-contracts';

// #endregion

/**
 * Persists validated mobile-access state through atomic private-file replacement.
 *
 * @public
 */
export class JsonMobileAccessRepository implements IMobileAccessRepository {
  // #region Ctor

  /**
   * Binds the existing file paths and validation dependencies.
   *
   * @public
   */
  public constructor(private readonly _path: string) {}

  // #endregion

  // #region Methods

  /**
   * Initializes.
   *
   * @public
   */
  public initialize(): void {
    mkdirSync(dirname(this._path), { recursive: true, mode: 0o700 });
  }

  /**
   * Loads.
   *
   * @public
   */
  public load(): PersistedMobileAccess {
    if (!existsSync(this._path))
      return persistedMobileAccessSchema.parse(defaultPersistedMobileAccess);
    try {
      return persistedMobileAccessSchema.parse(JSON.parse(readFileSync(this._path, 'utf8')));
    } catch (cause) {
      throw new Error(
        `Unable to read Symphony mobile-access settings: ${cause instanceof Error ? cause.message : 'invalid JSON'}`,
        { cause },
      );
    }
  }

  /**
   * Saves.
   *
   * @param settings - Settings.
   * @public
   */
  public save(settings: PersistedMobileAccess): PersistedMobileAccess {
    const validated = persistedMobileAccessSchema.parse(settings);
    const temporaryPath = `${this._path}.${process.pid}.${randomUUID()}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(validated, null, 2)}\n`, {
      encoding: 'utf8',
      mode: 0o600,
    });
    renameSync(temporaryPath, this._path);
    chmodSync(this._path, 0o600);
    return validated;
  }

  // #endregion
}
