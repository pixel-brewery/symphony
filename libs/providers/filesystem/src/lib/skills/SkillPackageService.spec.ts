// #region Imports

import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { SkillPackageService } from './SkillPackageService';

// #endregion

const temporaryRoots: string[] = [];

function createRoot(): string {
  const root = mkdtempSync(join(tmpdir(), 'symphony-skills-'));
  temporaryRoots.push(root);
  return root;
}

afterEach(() => {
  for (const root of temporaryRoots.splice(0)) rmSync(root, { force: true, recursive: true });
});

describe('SkillPackageService', () => {
  it('creates a portable shared skill and discovers all standard resources', () => {
    // arrange
    const root = createRoot();
    const shared = join(root, 'shared');
    const service = new SkillPackageService(shared, join(root, 'legacy'));

    // act
    const saved = service.save({
      name: 'release-notes',
      description: 'Use when release notes must be drafted from completed changes.',
      instructions: '# Workflow\n\n1. Collect the changes.\n2. Draft concise notes.',
      openaiYaml:
        'interface:\n  display_name: Release notes\npolicy:\n  allow_implicit_invocation: false',
      files: [
        {
          path: 'references/style.md',
          kind: 'reference',
          encoding: 'utf8',
          content: '# Style\n\nUse short sentences.\n',
          size: 31,
        },
      ],
    });

    // assert
    expect(saved.displayName).toBe('Release notes');
    expect(saved.implicitInvocation).toBe(false);
    expect(saved.files).toHaveLength(1);
    expect(service.list().packages.map((skill) => skill.id)).toContain('user:release-notes');
    expect(readFileSync(join(shared, 'release-notes', 'SKILL.md'), 'utf8')).toContain(
      'name: release-notes',
    );
  });

  it('discovers a repository skill as read-only and installs a shared copy', () => {
    // arrange
    const root = createRoot();
    const shared = join(root, 'shared');
    const repository = join(root, 'repository-skills');
    const source = join(repository, 'triage-issue');
    mkdirSync(source, { recursive: true });
    writeFileSync(
      join(source, 'SKILL.md'),
      '---\nname: triage-issue\ndescription: Use when an issue needs evidence-based triage.\n---\n\n# Triage\n',
    );
    const service = new SkillPackageService(shared, join(root, 'legacy'));

    // act
    const discovered = service
      .list(repository)
      .packages.find((skill) => skill.id === 'repository:triage-issue');
    // assert
    expect(discovered?.editable).toBe(false);

    const installed = service.import(source);
    expect(installed.id).toBe('user:triage-issue');
    expect(installed.editable).toBe(true);
  });

  it('rejects escaping resource paths and moves deleted skills into recoverable trash', () => {
    // arrange
    const root = createRoot();
    const shared = join(root, 'shared');
    // act
    const service = new SkillPackageService(shared, join(root, 'legacy'));
    // assert
    expect(() =>
      service.save({
        name: 'unsafe-skill',
        description: 'Use when testing unsafe paths.',
        instructions: '# Test',
        openaiYaml: '',
        files: [
          {
            path: '../outside.md',
            kind: 'reference',
            encoding: 'utf8',
            content: 'unsafe',
            size: 6,
          },
        ],
      }),
    ).toThrow('escapes the skill folder');

    service.save({
      name: 'temporary-skill',
      description: 'Use when testing recoverable removal.',
      instructions: '# Test',
      openaiYaml: '',
      files: [],
    });
    const result = service.delete('temporary-skill');
    expect(result.message).toContain('.trash');
    expect(service.list().packages).toHaveLength(0);
  });

  it('preserves the serialized package bytes and sorted-resource digest', () => {
    // arrange
    const root = createRoot();
    const shared = join(root, 'shared');
    const service = new SkillPackageService(shared, join(root, 'legacy'));
    // act
    const saved = service.save({
      name: 'digest-fixture',
      description: '  Exact bytes.  ',
      instructions: '  # Workflow\r\n\r\nKeep bytes.  ',
      openaiYaml: '\ninterface:\n  display_name: Golden\n\n',
      files: [
        {
          path: 'references/policy.md',
          kind: 'reference',
          encoding: 'utf8',
          content: 'Grüße\r\n🙂\n',
          size: 14,
        },
        {
          path: 'assets/pixel.bin',
          kind: 'asset',
          encoding: 'base64',
          content: 'AAECAw==',
          size: 4,
        },
      ],
    });
    // assert
    expect(readFileSync(join(shared, 'digest-fixture', 'SKILL.md'), 'utf8')).toBe(
      '---\nname: digest-fixture\ndescription: "Exact bytes."\n---\n\n# Workflow\r\n\r\nKeep bytes.\n',
    );
    expect(readFileSync(join(shared, 'digest-fixture', 'agents', 'openai.yaml'), 'utf8')).toBe(
      'interface:\n  display_name: Golden\n',
    );
    expect(saved.files.map((file) => file.path)).toEqual([
      'assets/pixel.bin',
      'references/policy.md',
    ]);
    expect(saved.digest).toBe('8efe77ba57df0206222b9c0e4f4bea795c82e9281364428e358446f703a988ee');
  });
});
