// #region Imports

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from 'yaml';
import { ValidatePagesPublicationWorkflow } from './ValidatePagesPublicationWorkflow.mjs';

// #endregion

function sources() {
  return {
    releaseSource: readFileSync('.github/workflows/release.yml', 'utf8'),
    promotionSource: readFileSync('.github/workflows/promote-release.yml', 'utf8'),
    pagesSource: readFileSync('.github/workflows/publish-pages.yml', 'utf8'),
    refreshSource: readFileSync('.github/workflows/refresh-downloads.yml', 'utf8'),
  };
}

describe('ValidatePagesPublicationWorkflow', () => {
  it.skipIf(process.platform === 'win32')(
    'parses the actual Linux publication scripts as Bash',
    () => {
      // arrange
      const workflows = sources();
      const scripts = [
        workflows.pagesSource,
        workflows.promotionSource,
        workflows.refreshSource,
      ].flatMap((source) => {
        const workflow = parse(source) as {
          jobs: Record<string, { steps?: { name?: string; run?: string }[] }>;
        };
        return Object.values(workflow.jobs)
          .flatMap((job) => job.steps ?? [])
          .filter((step) => typeof step.run === 'string');
      });

      // act
      const results = scripts.map((step) => ({
        name: step.name,
        result: spawnSync('bash', ['--noprofile', '--norc', '-n'], {
          input: step.run,
          encoding: 'utf8',
        }),
      }));

      // assert
      for (const { name, result } of results) {
        expect(result.error, name).toBeUndefined();
        expect(result.status, `${name}: ${result.stderr}`).toBe(0);
      }
    },
  );

  it('accepts the complete publication and migration contract', () => {
    // arrange
    const workflows = sources();
    // act
    const failures = ValidatePagesPublicationWorkflow(workflows);
    // assert
    expect(failures).toEqual([]);
  });

  it('blocks cleanup when published historical files have not been verified', () => {
    // arrange
    const workflows = sources();
    workflows.pagesSource = workflows.pagesSource.replace(
      'Verify every published page, feed and historical file',
      'Skip public verification',
    );
    // act
    const failures = ValidatePagesPublicationWorkflow(workflows);
    // assert
    expect(failures).toContain(
      'Preservation, deployment and every-file verification must precede branch removal.',
    );
  });

  it('blocks cleanup without protection against an unarchived branch change', () => {
    // arrange
    const workflows = sources();
    workflows.pagesSource = workflows.pagesSource.replace(
      '"$current_commit" != "$MIGRATED_COMMIT"',
      '"$current_commit" = "unused"',
    );
    // act
    const failures = ValidatePagesPublicationWorkflow(workflows);
    // assert
    expect(failures).toContain('Branch removal must require an unchanged archived revision.');
  });

  it('rejects publishing from an arbitrary source branch', () => {
    // arrange
    const workflows = sources();
    workflows.pagesSource = workflows.pagesSource.replace(
      "github.ref == 'refs/heads/main'",
      'true',
    );
    // act
    const failures = ValidatePagesPublicationWorkflow(workflows);
    // assert
    expect(failures).toContain(
      'Only the canonical main repository may publish downloads or remove the old branch.',
    );
  });

  it('requires metadata to be durable before making a release public', () => {
    // arrange
    const workflows = sources();
    workflows.releaseSource = workflows.releaseSource.replace('            --draft \\\n', '');
    // act
    const failures = ValidatePagesPublicationWorkflow(workflows);
    // assert
    expect(failures).toContain(
      'Only verified installers with durable metadata may become public and select Stable.',
    );
  });

  it('requires the download site to refresh after manual Stable selection', () => {
    // arrange
    const workflows = sources();
    workflows.promotionSource = workflows.promotionSource.replace(
      'needs: promote',
      'needs: unused',
    );
    // act
    const failures = ValidatePagesPublicationWorkflow(workflows);
    // assert
    expect(failures).toContain(
      'Every release and Stable selection must refresh Pages after its successful owner.',
    );
  });

  it('rejects dispatching manual release changes from a release-provided source ref', () => {
    // arrange
    const workflows = sources();
    workflows.refreshSource = workflows.refreshSource.replace('--ref main', '--ref "$GITHUB_REF"');
    // act
    const failures = ValidatePagesPublicationWorkflow(workflows);
    // assert
    expect(failures).toContain(
      'Manual release publication and edits must dispatch the trusted main Pages workflow.',
    );
  });
});
