// #region Imports

import { execFileSync, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { dirname, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ClassifyCiChanges } from './ClassifyCiChanges.mjs';

// #endregion

let root: string;
let base: string;

function git(...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim();
}

function write(path: string, value = 'Updated documentation.\n'): void {
  mkdirSync(dirname(resolve(root, path)), { recursive: true });
  writeFileSync(resolve(root, path), value);
}

function commit(): string {
  git('add', '--all');
  git(
    '-c',
    'user.name=CI test',
    '-c',
    'user.email=ci-test@example.invalid',
    '-c',
    'commit.gpgsign=false',
    'commit',
    '--quiet',
    '-m',
    'Fixture change',
  );
  return git('rev-parse', 'HEAD');
}

function classify(head: string) {
  return ClassifyCiChanges(
    { eventName: 'push', event: { before: base, after: head } },
    { cwd: root },
  );
}

beforeEach(() => {
  mkdirSync('.local', { recursive: true });
  root = mkdtempSync(resolve('.local/ci-scope-test-'));
  git('init', '--quiet');
  write('README.md', '# Example\n');
  write('docs/guide.md', '# Guide\n');
  write('src/entry.ts', 'export const example = true;\n');
  base = commit();
});

afterEach(() => rmSync(root, { recursive: true, force: true }));

describe('documentation-only CI classification', () => {
  it.each([
    'README.md',
    'CONTRIBUTING.md',
    'docs/guide.md',
    'docs/guide.txt',
    'docs/guide.rst',
    'docs/screen.png',
    'docs/figure.svg',
    '.github/assets/hero.webp',
    'libs/example/README.md',
    'libs/example/README-extra.txt',
    'LICENSE',
    'NOTICE.txt',
    'README.TXT',
    'docs/notes.TXT',
    'resources/plugins/example/README.md',
    'resources/download-page/README.md',
  ])('skips heavy verification for documentation path %s', (path) => {
    // arrange
    write(path);
    const head = commit();

    // act
    const result = classify(head);

    // assert
    expect(result.documentationOnly).toBe(true);
    expect(result.documentationChanged).toBe(path.startsWith('docs/'));
  });

  it.each([
    'src/entry.ts',
    'docs/example.js',
    'docs/site.html',
    'docs/config.json',
    '.github/workflows/ci.yml',
    '.github/instructions/runtime.md',
    '.agents/skills/example/SKILL.md',
    '.claude/settings.md',
    'AGENTS.md',
    'CLAUDE.md',
    'CODEX.md',
    'libs/example/GEMINI.md',
    'docs/example/claude.md',
    'libs/example/AGENTS.md',
    'resources/prompts/solver.md',
    'resources/prompt/solver.md',
    'resources/skill/README.md',
    'docs/.ds-sync/README.md',
    'docs/.agents/example.md',
    'docs/.github/instructions.md',
    '.github/assets/notes.md',
    'resources/config.txt',
    'apps/desktop/assets/icon.png',
    'docs/guide\nscript.js',
    'README.md\nsource.ts',
  ])('keeps full verification for executable, operational or unknown path %s', (path) => {
    // arrange
    write(path);
    const head = commit();

    // act
    const result = classify(head);

    // assert
    expect(result.documentationOnly).toBe(false);
  });

  it('includes all commits in a multi-commit push', () => {
    // arrange
    write('src/entry.ts', 'export const example = false;\n');
    commit();
    write('README.md');
    const head = commit();

    // act
    const result = classify(head);

    // assert
    expect(result.documentationOnly).toBe(false);
  });

  it.each([
    ['src/entry.ts', 'docs/entry.md', false],
    ['docs/guide.md', 'src/guide.ts', false],
    ['docs/guide.md', 'docs/renamed.md', true],
  ] as const)('classifies both sides of a rename from %s to %s', (source, target, expected) => {
    // arrange
    renameSync(resolve(root, source), resolve(root, target));
    const head = commit();

    // act
    const result = classify(head);

    // assert
    expect(result.documentationOnly).toBe(expected);
  });

  it('compares a pull request against its merge base rather than unrelated target changes', () => {
    // arrange
    write('src/entry.ts', 'export const mainChange = true;\n');
    const target = commit();
    git('checkout', '--quiet', '--detach', base);
    write('README.md');
    const head = commit();

    // act
    const result = ClassifyCiChanges(
      {
        eventName: 'pull_request',
        event: { pull_request: { base: { sha: target }, head: { sha: head } } },
      },
      { cwd: root },
    );

    // assert
    expect(result.documentationOnly).toBe(true);
  });

  it('classifies the complete merge-group base and head', () => {
    // arrange
    write('docs/guide.md');
    const head = commit();

    // act
    const result = ClassifyCiChanges(
      { eventName: 'merge_group', event: { merge_group: { base_sha: base, head_sha: head } } },
      { cwd: root },
    );

    // assert
    expect(result.documentationOnly).toBe(true);
    expect(result.documentationChanged).toBe(true);
  });

  it.each(['workflow_dispatch', 'workflow_call', 'release', 'unknown'])(
    'requires full verification for %s even with a documentation-only payload',
    (eventName) => {
      // arrange
      write('README.md');
      const head = commit();

      // act
      const result = ClassifyCiChanges(
        { eventName, event: { before: base, after: head } },
        { cwd: root },
      );

      // assert
      expect(result.documentationOnly).toBe(false);
      expect(result.documentationChanged).toBe(true);
    },
  );

  it.each([undefined, '', '0'.repeat(40), 'f'.repeat(40), '--invalid-revision'])(
    'requires full verification when history cannot establish a valid diff (%s)',
    (before) => {
      // arrange
      write('README.md');
      const head = commit();

      // act
      const result = ClassifyCiChanges(
        { eventName: 'push', event: { before, after: head } },
        { cwd: root },
      );

      // assert
      expect(result.documentationOnly).toBe(false);
      expect(result.documentationChanged).toBe(true);
    },
  );

  it('requires full verification for an empty diff', () => {
    // arrange
    const head = base;

    // act
    const result = classify(head);

    // assert
    expect(result.documentationOnly).toBe(false);
  });

  it('writes only explicit booleans to the Actions output file', () => {
    // arrange
    write('docs/guide.md');
    const head = commit();
    write('event.json', JSON.stringify({ before: base, after: head }));
    const output = resolve(root, 'actions-output');

    // act
    const result = spawnSync(process.execPath, [resolve('tools/ClassifyCiChanges.mjs')], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: 'push',
        GITHUB_EVENT_PATH: resolve(root, 'event.json'),
        GITHUB_OUTPUT: output,
      },
    });

    // assert
    expect(result.status).toBe(0);
    expect(readFileSync(output, 'utf8')).toBe(
      'documentation_only=true\ndocumentation_changed=true\n',
    );
  });

  it('fails classification without writing a skip decision when event JSON is invalid', () => {
    // arrange
    write('event.json', '{invalid');
    const output = resolve(root, 'actions-output');

    // act
    const result = spawnSync(process.execPath, [resolve('tools/ClassifyCiChanges.mjs')], {
      cwd: root,
      encoding: 'utf8',
      env: {
        ...process.env,
        GITHUB_EVENT_NAME: 'push',
        GITHUB_EVENT_PATH: resolve(root, 'event.json'),
        GITHUB_OUTPUT: output,
      },
    });

    // assert
    expect(result.status).not.toBe(0);
    expect(existsSync(output)).toBe(false);
  });
});
