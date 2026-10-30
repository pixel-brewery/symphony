// #region Imports

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { codexApplicationCandidates } from './codexApplicationCandidates';

// #endregion

let root: string;
let application: string;
let cliRoot: string;

beforeEach(() => {
  root = mkdtempSync(join(tmpdir(), 'symphony-codex-application-'));
  application = join(root, 'Codex.app');
  cliRoot = join(application, 'Contents', 'Resources', 'codex-cli');
  mkdirSync(cliRoot, { recursive: true });
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('codexApplicationCandidates', () => {
  it('prefers the package manifest entrypoint while retaining current and legacy fallbacks', () => {
    // arrange
    writeFileSync(
      join(cliRoot, 'codex-package.json'),
      JSON.stringify({ layoutVersion: 1, entrypoint: 'custom/codex' }),
    );

    // act
    const actual = codexApplicationCandidates([application]);

    // assert
    expect(actual).toEqual([
      join(cliRoot, 'custom', 'codex'),
      join(cliRoot, 'bin', 'codex'),
      join(cliRoot, 'CodexCLI.app', 'Contents', 'MacOS', 'codex'),
      join(application, 'Contents', 'Resources', 'codex'),
    ]);
  });

  it.each([
    ['parent traversal', { layoutVersion: 1, entrypoint: '../outside/codex' }],
    ['an absolute path', { layoutVersion: 1, entrypoint: '/outside/codex' }],
    ['a Windows path separator', { layoutVersion: 1, entrypoint: '..\\outside\\codex' }],
    ['a control character', { layoutVersion: 1, entrypoint: 'bin/\u0000codex' }],
    ['an unknown layout', { layoutVersion: 2, entrypoint: 'custom/codex' }],
    ['an empty entrypoint', { layoutVersion: 1, entrypoint: '' }],
    ['the CLI root itself', { layoutVersion: 1, entrypoint: '.' }],
    ['an invalid manifest shape', null],
  ])('ignores a manifest containing %s without losing known layouts', (_description, manifest) => {
    // arrange
    writeFileSync(join(cliRoot, 'codex-package.json'), JSON.stringify(manifest));

    // act
    const actual = codexApplicationCandidates([application]);

    // assert
    expect(actual[0]).toBe(join(cliRoot, 'bin', 'codex'));
    expect(actual).toHaveLength(3);
  });

  it.each([
    ['malformed JSON', '{'],
    [
      'an oversized manifest',
      JSON.stringify({
        layoutVersion: 1,
        entrypoint: 'custom/codex',
        padding: 'x'.repeat(16 * 1024),
      }),
    ],
  ])('ignores %s without preventing fallback discovery', (_description, contents) => {
    // arrange
    writeFileSync(join(cliRoot, 'codex-package.json'), contents);

    // act
    const actual = codexApplicationCandidates([application]);

    // assert
    expect(actual[0]).toBe(join(cliRoot, 'bin', 'codex'));
    expect(actual).toHaveLength(3);
  });

  it('ignores a directory used as optional metadata', () => {
    // arrange
    mkdirSync(join(cliRoot, 'codex-package.json'));

    // act
    const actual = codexApplicationCandidates([application]);

    // assert
    expect(actual[0]).toBe(join(cliRoot, 'bin', 'codex'));
  });

  it('retains known layouts for missing application roots', () => {
    // arrange
    const missing = join(root, 'Missing.app');

    // act
    const actual = codexApplicationCandidates([missing]);

    // assert
    expect(actual[0]).toBe(join(missing, 'Contents', 'Resources', 'codex-cli', 'bin', 'codex'));
  });
});
