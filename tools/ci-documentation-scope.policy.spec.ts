// #region Imports

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';

// #endregion

const quality = parse(readFileSync('.github/workflows/ci.yml', 'utf8'));
const release = parse(readFileSync('.github/workflows/release.yml', 'utf8'));
const pages = parse(readFileSync('.github/workflows/publish-pages.yml', 'utf8'));

describe('documentation-only workflow policy', () => {
  it('limits automatic download-site publication to actual runtime resources', () => {
    // arrange
    const paths: string[] = pages.on.push.paths;
    const builder = readFileSync('tools/BuildDownloadSite.mjs', 'utf8');

    // act
    const resourcePaths = paths.filter((path) => path.startsWith('resources/download-page/'));

    // assert
    expect(resourcePaths).toEqual(['resources/download-page/downloads.css']);
    expect(builder).toContain('../resources/download-page/downloads.css');
    expect(Object.keys(pages.on)).toEqual(
      expect.arrayContaining(['workflow_call', 'workflow_dispatch']),
    );
  });

  it('keeps the required workflow active and classifies before every heavy job', () => {
    // arrange
    const trigger = quality.on;

    // act
    const guarded = ['electron-e2e', 'package'].every(
      (name) =>
        [quality.jobs[name].needs].flat().includes('changes') &&
        quality.jobs[name].if === "needs.changes.outputs.documentation_only != 'true'",
    );

    // assert
    expect(Object.values(trigger).some((event) => event?.['paths-ignore'] || event?.paths)).toBe(
      false,
    );
    expect(guarded).toBe(true);
    expect(quality.jobs.quality.if).toBeUndefined();
    expect(quality.jobs.quality.needs).toBe('changes');
    expect(quality.jobs.quality['runs-on']).toBe(
      "${{ needs.changes.outputs.documentation_only == 'true' && 'ubuntu-latest' || matrix.os }}",
    );
    expect(quality.jobs.quality.strategy.matrix.os).toEqual([
      'ubuntu-latest',
      'macos-latest',
      'windows-latest',
    ]);
    expect(
      quality.jobs.quality.steps
        .slice(1)
        .every((step) => step.if === "needs.changes.outputs.documentation_only != 'true'"),
    ).toBe(true);
    expect(quality.jobs.changes.steps.some((step) => step.run?.includes('yarn install'))).toBe(
      false,
    );
    expect(
      quality.jobs.documentation.steps.some((step) => step.run?.includes('yarn install')),
    ).toBe(false);
    expect(quality.jobs['quality-gate'].if).toBe('${{ always() }}');
    expect(quality.jobs['quality-gate'].needs).toEqual([
      'changes',
      'documentation',
      'quality',
      'electron-e2e',
      'package',
    ]);
  });

  it.each([
    ['true', 'success', 'success', 'success', 'skipped', 'skipped', true],
    ['false', 'success', 'success', 'success', 'success', 'success', true],
    ['true', 'failure', 'success', 'success', 'skipped', 'skipped', false],
    ['true', 'cancelled', 'success', 'success', 'skipped', 'skipped', false],
    ['true', 'success', 'failure', 'success', 'skipped', 'skipped', false],
    ['true', 'success', 'skipped', 'success', 'skipped', 'skipped', false],
    ['true', 'success', 'success', 'skipped', 'skipped', 'skipped', false],
    ['false', 'success', 'success', 'skipped', 'skipped', 'skipped', false],
    ['false', 'success', 'success', 'success', 'cancelled', 'success', false],
    ['false', 'success', 'success', 'success', 'success', 'failure', false],
    ['', 'success', 'success', 'skipped', 'skipped', 'skipped', false],
    ['true', 'success', 'success', 'success', 'success', 'skipped', false],
  ] as const)(
    'checks the actual aggregate script for scope=%s changes=%s docs=%s quality=%s e2e=%s package=%s',
    (scope, changes, docs, source, e2e, packaging, expected) => {
      // arrange
      const script = quality.jobs['quality-gate'].steps[0].run;

      // act
      const result = spawnSync('bash', ['-c', script], {
        env: {
          ...process.env,
          DOCUMENTATION_ONLY: scope,
          CHANGES_RESULT: changes,
          DOCUMENTATION_RESULT: docs,
          QUALITY_RESULT: source,
          E2E_RESULT: e2e,
          PACKAGE_RESULT: packaging,
        },
      });

      // assert
      expect(result.status === 0).toBe(expected);
    },
  );

  it('gates candidate preparation before install and preserves full downstream release verification', () => {
    // arrange
    const configure = release.jobs.configure;

    // act
    const firstReleaseCommand = configure.steps.find((step) => step.run?.includes('yarn install'));

    // assert
    expect(configure.needs).toBe('changes');
    expect(configure.if).toContain("needs.changes.outputs.documentation_only != 'true'");
    expect(release.jobs.changes.steps.some((step) => step.run?.includes('yarn install'))).toBe(
      false,
    );
    expect(firstReleaseCommand).toBeDefined();
    expect(release.jobs.verify.needs).toBe('configure');
    expect(release.jobs.verify.if).toBeUndefined();
    expect(release.jobs.publish.if).toBeUndefined();
  });
});
