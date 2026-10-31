// #region Imports

import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registeredCodexApplications } from './registeredCodexApplications';

// #endregion

vi.mock('node:child_process', () => ({ execFileSync: vi.fn() }));

afterEach(() => vi.resetAllMocks());

describe('registeredCodexApplications', () => {
  it('reads registered application metadata with bounded execution and no application launch', () => {
    // arrange
    const application = join(process.cwd(), 'Relocated Codex.app');
    vi.mocked(execFileSync).mockReturnValue(JSON.stringify([application]));

    // act
    const actual = registeredCodexApplications();

    // assert
    expect(actual).toEqual([application]);
    expect(execFileSync).toHaveBeenCalledWith(
      '/usr/bin/osascript',
      [
        '-l',
        'JavaScript',
        '-e',
        expect.stringMatching(
          /com\.openai\.codex[\s\S]*com\.openai\.chat[\s\S]*URLForApplicationWithBundleIdentifier\(identifier\)/u,
        ),
      ],
      {
        encoding: 'utf8',
        timeout: 1_500,
        maxBuffer: 16 * 1024,
        stdio: ['ignore', 'pipe', 'ignore'],
      },
    );
  });

  it.each([
    ['malformed JSON', '{'],
    ['a non-array result', '{}'],
    ['more than two applications', JSON.stringify(['/one.app', '/two.app', '/three.app'])],
    ['relative paths', JSON.stringify(['relative/Codex.app'])],
    ['a non-bundle path', JSON.stringify(['/Applications/codex'])],
    ['control characters', JSON.stringify(['/Applications/Co\u0000dex.app'])],
    ['an oversized path', JSON.stringify(['/' + 'x'.repeat(4096) + '.app'])],
    ['non-string values', JSON.stringify([null, 123])],
  ])('ignores %s from unavailable or malformed native metadata', (_description, output) => {
    // arrange
    vi.mocked(execFileSync).mockReturnValue(output);

    // act
    const actual = registeredCodexApplications();

    // assert
    expect(actual).toEqual([]);
  });

  it('continues without metadata when native lookup fails or times out', () => {
    // arrange
    vi.mocked(execFileSync).mockImplementation(() => {
      throw new Error('Native metadata is unavailable.');
    });

    // act
    const actual = registeredCodexApplications();

    // assert
    expect(actual).toEqual([]);
  });
});
