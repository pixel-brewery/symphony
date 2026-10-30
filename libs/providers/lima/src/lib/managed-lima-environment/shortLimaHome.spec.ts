// #region Imports

import { lstatSync, mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { shortLimaHome } from './shortLimaHome';

// #endregion

const temporaryDirectories: string[] = [];
const aliases: string[] = [];

afterEach(() => {
  for (const alias of aliases.splice(0)) rmSync(alias, { recursive: true, force: true });
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function createRuntimeRoot(): string {
  const runtimeRoot = mkdtempSync(join(tmpdir(), 'short-lima-home-'));
  temporaryDirectories.push(runtimeRoot);
  return runtimeRoot;
}

describe('shortLimaHome', () => {
  it('repairs an alias whose target no longer exists', () => {
    // arrange
    const runtimeRoot = createRuntimeRoot();
    const alias = shortLimaHome(runtimeRoot);
    aliases.push(alias);
    rmSync(alias, { force: true });
    symlinkSync(join(runtimeRoot, 'removed-lima'), alias, 'dir');

    // act
    const actual = shortLimaHome(runtimeRoot);

    // assert
    expect(actual).toBe(alias);
    expect(realpathSync(actual)).toBe(realpathSync(join(runtimeRoot, 'lima')));
  });

  it('repairs an alias that still points at another runtime root', () => {
    // arrange
    const runtimeRoot = createRuntimeRoot();
    const foreignLimaHome = join(createRuntimeRoot(), 'lima');
    mkdirSync(foreignLimaHome, { recursive: true });
    const alias = shortLimaHome(runtimeRoot);
    aliases.push(alias);
    rmSync(alias, { force: true });
    symlinkSync(foreignLimaHome, alias, 'dir');

    // act
    const actual = shortLimaHome(runtimeRoot);

    // assert
    expect(realpathSync(actual)).toBe(realpathSync(join(runtimeRoot, 'lima')));
  });

  it('repairs an alias that was replaced by a directory', () => {
    // arrange
    const runtimeRoot = createRuntimeRoot();
    const alias = shortLimaHome(runtimeRoot);
    aliases.push(alias);
    rmSync(alias, { force: true });
    mkdirSync(join(alias, '_config'), { recursive: true });

    // act
    const actual = shortLimaHome(runtimeRoot);

    // assert
    expect(actual).toBe(alias);
    expect(lstatSync(actual).isSymbolicLink()).toBe(true);
    expect(realpathSync(actual)).toBe(realpathSync(join(runtimeRoot, 'lima')));
  });
});
