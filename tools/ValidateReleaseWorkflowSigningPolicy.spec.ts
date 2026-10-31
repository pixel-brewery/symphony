// #region Imports

import { execFile } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { parse, stringify } from 'yaml';
import { ValidateReleaseWorkflowSigningPolicy } from './ValidateReleaseWorkflowSigningPolicy.mjs';

// #endregion

const run = promisify(execFile);

describe('release workflow signing policy', () => {
  it('keeps signing credentials optional and platform-scoped', async () => {
    // arrange
    const policyScript = resolve('tools/ValidateReleaseWorkflowSigningPolicy.mjs');

    // act
    const result = await run(process.execPath, [policyScript]);

    // assert
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('signing credentials are optional');
  });

  it('rejects hardened runtime for the ad-hoc identity', async () => {
    // arrange
    const workflowSource = await readFile(resolve('.github/workflows/release.yml'), 'utf8');
    const forgeSource = (await readFile(resolve('forge.config.mjs'), 'utf8')).replace(
      '      optionsForFile: () => ({ hardenedRuntime: false }),\n',
      '',
    );

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(workflowSource, forgeSource);

    // assert
    expect(violations).toContain(
      'macOS builds without Apple credentials must receive a launchable complete ad-hoc signature.',
    );
  });

  it('rejects non-ARM64 release jobs', async () => {
    // arrange
    const workflowSource = (
      await readFile(resolve('.github/workflows/release.yml'), 'utf8')
    ).replace('        arch: [arm64]\n', '        arch: [arm64, x64]\n');
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(workflowSource, forgeSource);

    // assert
    expect(violations).toContain('The macOS release matrix must build only ARM64.');
  });

  it('rejects re-enabled ZIP release packaging', async () => {
    // arrange
    const workflowSource = await readFile(resolve('.github/workflows/release.yml'), 'utf8');
    const forgeSource = (await readFile(resolve('forge.config.mjs'), 'utf8')).replace(
      "    // new MakerZIP({}, ['darwin', 'linux', 'win32']),",
      "    new MakerZIP({}, ['darwin', 'linux', 'win32']),",
    );

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(workflowSource, forgeSource);

    // assert
    expect(violations).toContain('ZIP release packaging must remain present but commented out.');
  });

  it('rejects publication before the canonical repository is public', async () => {
    // arrange
    const workflowSource = (
      await readFile(resolve('.github/workflows/release.yml'), 'utf8')
    ).replace(' || repository.private ||', ' ||');
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(workflowSource, forgeSource);

    // assert
    expect(violations).toContain(
      'Desktop publication must require the transferred public main repository.',
    );
  });

  it('rejects publishing without every native build passing', async () => {
    // arrange
    const workflowSource = (
      await readFile(resolve('.github/workflows/release.yml'), 'utf8')
    ).replace('needs: [configure, macos, windows, linux]', 'needs: [configure, macos, windows]');
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(workflowSource, forgeSource);

    // assert
    expect(violations).toContain(
      'Publication must require every successful native build and release identity.',
    );
  });

  it('rejects publishing after verification on only one operating system', async () => {
    // arrange
    const workflowSource = (
      await readFile(resolve('.github/workflows/release.yml'), 'utf8')
    ).replace('os: [ubuntu-latest, macos-latest, windows-latest]', 'os: [ubuntu-latest]');
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(workflowSource, forgeSource);

    // assert
    expect(violations).toContain(
      'The prepared release must pass verification on all three operating systems.',
    );
  });

  it('rejects resolving a different version after verification', async () => {
    // arrange
    const workflowSource = (
      await readFile(resolve('.github/workflows/release.yml'), 'utf8')
    ).replace(
      '      - name: Prepare the release assets and channel metadata\n        run: node tools/prepare-update-publication.mjs',
      '      - name: Prepare the release assets and channel metadata\n        run: yarn release:nx patch',
    );
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(workflowSource, forgeSource);

    // assert
    expect(violations).toContain(
      'Publication must use the one metadata-only release commit prepared from its source.',
    );
  });

  it('rejects publishing without the Electron acceptance gate', async () => {
    // arrange
    const workflowSource = (
      await readFile(resolve('.github/workflows/release.yml'), 'utf8')
    ).replace('run: yarn e2e', 'run: echo skipped');
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(workflowSource, forgeSource);

    // assert
    expect(violations).toContain(
      'Release verification must include the macOS Electron and package smoke gates.',
    );
  });

  it('rejects dependency installation with a reusable token', async () => {
    // arrange
    const workflowSource = (
      await readFile(resolve('.github/workflows/release.yml'), 'utf8')
    ).replace('GITHUB_TOKEN: ${{ github.token }}', 'GITHUB_TOKEN: ${{ secrets.PACKAGES_TOKEN }}');
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(workflowSource, forgeSource);

    // assert
    expect(violations).toContain(
      'Release dependencies must use the short-lived package-read job token.',
    );
  });

  it.each([
    {
      name: 'an installation token covering every repository',
      mutate(workflow: ReturnType<typeof parse>) {
        const mint = workflow.jobs.publish.steps.find(
          (step: { id?: string }) => step.id === 'release-app-token',
        );
        delete mint.with.repositories;
      },
    },
    {
      name: 'a token with additional permissions',
      mutate(workflow: ReturnType<typeof parse>) {
        const mint = workflow.jobs.publish.steps.find(
          (step: { id?: string }) => step.id === 'release-app-token',
        );
        mint.with['permission-administration'] = 'write';
      },
    },
    {
      name: 'disabled installation-token revocation',
      mutate(workflow: ReturnType<typeof parse>) {
        const mint = workflow.jobs.publish.steps.find(
          (step: { id?: string }) => step.id === 'release-app-token',
        );
        mint.with['skip-token-revoke'] = true;
      },
    },
  ])('rejects $name', async ({ mutate }) => {
    // arrange
    const workflow = parse(await readFile(resolve('.github/workflows/release.yml'), 'utf8'));
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');
    mutate(workflow);

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(stringify(workflow), forgeSource);

    // assert
    expect(violations).toContain(
      'The release app token must be short-lived and contents-only for this repository.',
    );
  });

  it('rejects a release app key without its protected environment', async () => {
    // arrange
    const workflow = parse(await readFile(resolve('.github/workflows/release.yml'), 'utf8'));
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');
    delete workflow.jobs.publish.environment;

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(stringify(workflow), forgeSource);

    // assert
    expect(violations).toContain(
      'The release app private key must be isolated in the release-main environment.',
    );
  });

  it('rejects creating the app token before release verification', async () => {
    // arrange
    const workflow = parse(await readFile(resolve('.github/workflows/release.yml'), 'utf8'));
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');
    const steps = workflow.jobs.publish.steps;
    const mintIndex = steps.findIndex((step: { id?: string }) => step.id === 'release-app-token');
    const [mint] = steps.splice(mintIndex, 1);
    steps.unshift(mint);

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(stringify(workflow), forgeSource);

    // assert
    expect(violations).toContain(
      'Create the release app token only after verification, immediately before the atomic push.',
    );
  });

  it('rejects exposing the app key during dependency installation', async () => {
    // arrange
    const workflow = parse(await readFile(resolve('.github/workflows/release.yml'), 'utf8'));
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');
    const install = workflow.jobs.configure.steps.find(
      (step: { name?: string }) => step.name === 'Install dependencies',
    );
    install.env.RELEASE_APP_PRIVATE_KEY = '${{ secrets.RELEASE_APP_PRIVATE_KEY }}';

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(stringify(workflow), forgeSource);

    // assert
    expect(violations).toContain(
      'Only the atomic main/tag Git push may receive the release app token.',
    );
  });

  it('rejects using the release app token for GitHub API calls', async () => {
    // arrange
    const workflow = parse(await readFile(resolve('.github/workflows/release.yml'), 'utf8'));
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');
    const release = workflow.jobs.publish.steps.find(
      (step: { name?: string }) => step.name === 'Publish the GitHub release',
    );
    release.env.GH_TOKEN = '${{ steps.release-app-token.outputs.token }}';

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(stringify(workflow), forgeSource);

    // assert
    expect(violations).toContain(
      'Release API, Pages and workflow dispatch calls must keep the repository job token.',
    );
  });

  it('rejects publication that separates the main and tag pushes', async () => {
    // arrange
    const workflowSource = (
      await readFile(resolve('.github/workflows/release.yml'), 'utf8')
    ).replace('push --atomic origin', 'push origin');
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(workflowSource, forgeSource);

    // assert
    expect(violations).toContain(
      'Only the atomic main/tag Git push may receive the release app token.',
    );
  });

  it('rejects release credentials on pull request events', async () => {
    // arrange
    const workflow = parse(await readFile(resolve('.github/workflows/release.yml'), 'utf8'));
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');
    workflow.on.pull_request_target = {};

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(stringify(workflow), forgeSource);

    // assert
    expect(violations).toContain(
      'Release app credentials must be restricted to trusted main release events.',
    );
  });

  it.skipIf(process.platform === 'win32').each([
    { appId: '', hasPrivateKey: 'true' },
    { appId: '12345', hasPrivateKey: 'false' },
  ])(
    'fails closed for missing app configuration: $appId/$hasPrivateKey',
    async ({ appId, hasPrivateKey }) => {
      // arrange
      const workflow = parse(await readFile(resolve('.github/workflows/release.yml'), 'utf8'));
      const guard = workflow.jobs.publish.steps.find(
        (step: { name?: string }) => step.name === 'Require the release app configuration',
      );

      // act + assert
      await expect(
        run('/bin/bash', ['-c', guard.run], {
          env: { PATH: '', RELEASE_APP_ID: appId, HAS_RELEASE_APP_PRIVATE_KEY: hasPrivateKey },
        }),
      ).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining('Release app is not configured'),
      });
    },
  );

  it.skipIf(process.platform === 'win32')(
    'fails before Git runs when token creation provides no token',
    async () => {
      // arrange
      const workflow = parse(await readFile(resolve('.github/workflows/release.yml'), 'utf8'));
      const push = workflow.jobs.publish.steps.find(
        (step: { name?: string }) => step.name === 'Publish the release commit and tag',
      );

      // act + assert
      await expect(
        run('/bin/bash', ['-c', push.run], { env: { PATH: '', RELEASE_PUSH_TOKEN: '' } }),
      ).rejects.toMatchObject({
        code: 1,
        stdout: expect.stringContaining('Release push token is missing'),
      });
    },
  );
});
