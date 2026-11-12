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

describe('fixed desktop distribution configuration', () => {
  it.each(['darwin', 'win32', 'linux'])(
    'keeps ad-hoc sealing and unsigned installers with legacy certificate variables on %s',
    async (platform) => {
      // arrange
      const script = `
        Object.defineProperty(process, 'platform', { value: ${JSON.stringify(platform)} });
        const { default: config } = await import('./forge.config.mjs');
        const squirrel = config.makers.find((maker) => maker.name === 'squirrel');
        if (!squirrel) throw new Error('The Windows installer maker is required.');
        await squirrel.prepareConfig('arm64');
        const signing = config.packagerConfig.osxSign;
        process.stdout.write(JSON.stringify({
          macos: {
            identity: signing?.identity,
            identityValidation: signing?.identityValidation,
            continueOnError: signing?.continueOnError,
            options: signing?.optionsForFile?.('Symphony.app'),
          },
          notarization: 'osxNotarize' in config.packagerConfig,
          windowsPackageSigning: 'windowsSign' in config.packagerConfig,
          windowsInstallerSigning: [
            'windowsSign', 'certificateFile', 'certificatePassword', 'signWithParams',
          ].filter((key) => key in squirrel.config),
        }));
      `;

      // act
      const result = await run(process.execPath, ['--input-type=module', '-e', script], {
        cwd: resolve('.'),
        env: {
          PATH: process.env['PATH'],
          SystemRoot: process.env['SystemRoot'] ?? process.env['SYSTEMROOT'],
          APPLE_SIGNING_IDENTITY: 'synthetic-publisher-identity',
          MACOS_CERTIFICATE_BASE64: 'synthetic-certificate',
          MACOS_CERTIFICATE_PASSWORD: 'synthetic-password',
          APPLE_API_KEY_BASE64: 'synthetic-api-key',
          APPLE_API_KEY_PATH: 'synthetic-api-key.p8',
          APPLE_API_KEY_ID: 'synthetic-key-id',
          APPLE_API_ISSUER: 'synthetic-issuer',
          WINDOWS_CERTIFICATE_BASE64: 'synthetic-certificate',
          WINDOWS_CERTIFICATE_FILE: 'synthetic-certificate.pfx',
          WINDOWS_CERTIFICATE_PASSWORD: 'synthetic-password',
          WINDOWS_SIGN_WITH_PARAMS: '/a /f synthetic-certificate.pfx',
        },
        timeout: 5_000,
      });

      // assert
      expect(JSON.parse(result.stdout)).toEqual({
        macos: {
          identity: '-',
          identityValidation: false,
          continueOnError: false,
          options: { hardenedRuntime: false },
        },
        notarization: false,
        windowsPackageSigning: false,
        windowsInstallerSigning: [],
      });
    },
  );
});

describe('release workflow signing policy', () => {
  it('keeps fixed macOS sealing and unsigned installers', async () => {
    // arrange
    const policyScript = resolve('tools/ValidateReleaseWorkflowSigningPolicy.mjs');

    // act
    const result = await run(process.execPath, [policyScript]);

    // assert
    expect(result.stderr).toBe('');
    expect(result.stdout).toContain('fixed ad-hoc macOS sealing and unsigned installers');
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
      'Every macOS build must receive a launchable complete ad-hoc signature.',
    );
  });

  it.each(['APPLE_SIGNING_IDENTITY', 'WINDOWS_CERTIFICATE_BASE64'])(
    'rejects a release workflow that accepts platform credential %s',
    async (secret) => {
      // arrange
      const workflow = parse(await readFile(resolve('.github/workflows/release.yml'), 'utf8'));
      const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');
      workflow.jobs.configure.env = {
        ...workflow.jobs.configure.env,
        [secret]: '${{ secrets.' + secret + ' }}',
      };

      // act
      const violations = ValidateReleaseWorkflowSigningPolicy(stringify(workflow), forgeSource);

      // assert
      expect(violations).toContain(
        'Release workflows must not configure platform certificates or notarization.',
      );
    },
  );

  it.each([
    'security create-keychain -p synthetic-password synthetic.keychain',
    'xcrun notarytool submit synthetic.zip',
    'Get-AuthenticodeSignature synthetic.exe',
  ])('rejects certificate operations without an explicit secret reference: %s', async (command) => {
    // arrange
    const workflow = parse(await readFile(resolve('.github/workflows/release.yml'), 'utf8'));
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');
    workflow.jobs.macos.steps.push({ name: 'Configure platform trust', run: command });

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(stringify(workflow), forgeSource);

    // assert
    expect(violations).toContain(
      'Release workflows must not configure platform certificates or notarization.',
    );
  });

  it.each(['osxNotarize', 'windowsSign', 'certificateFile', 'signWithParams'])(
    'rejects reintroducing Forge option %s',
    async (option) => {
      // arrange
      const workflowSource = await readFile(resolve('.github/workflows/release.yml'), 'utf8');
      const forgeSource = (await readFile(resolve('forge.config.mjs'), 'utf8')).replace(
        '    asar: true,',
        `    asar: true,\n    ${option}: {},`,
      );

      // act
      const violations = ValidateReleaseWorkflowSigningPolicy(workflowSource, forgeSource);

      // assert
      expect(violations).toContain(
        'Forge must not accept platform certificates or notarization inputs.',
      );
    },
  );

  it('requires unconditional ad-hoc identity and runtime-flag verification', async () => {
    // arrange
    const workflow = parse(await readFile(resolve('.github/workflows/release.yml'), 'utf8'));
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');
    const verification = workflow.jobs.macos.steps.find(
      (step: { name?: string }) => step.name === 'Verify launchable ad-hoc signature',
    );
    verification.if = 'false';

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(stringify(workflow), forgeSource);

    // assert
    expect(violations).toContain(
      'Ad-hoc macOS builds must reject Hardened Runtime before publication.',
    );
  });

  it('requires strict bundle and disk-image integrity verification', async () => {
    // arrange
    const workflow = parse(await readFile(resolve('.github/workflows/release.yml'), 'utf8'));
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');
    workflow.jobs.macos.steps = workflow.jobs.macos.steps.filter(
      (step: { name?: string }) => step.name !== 'Verify macOS application and disk image',
    );

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(stringify(workflow), forgeSource);

    // assert
    expect(violations).toContain(
      'Every macOS build must verify its app signature and DMG before upload.',
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

  it.each(['verify', 'linux'])('rejects publishing without a successful %s job', async (job) => {
    // arrange
    const workflow = parse(await readFile(resolve('.github/workflows/release.yml'), 'utf8'));
    const forgeSource = await readFile(resolve('forge.config.mjs'), 'utf8');
    workflow.jobs.publish.needs = workflow.jobs.publish.needs.filter(
      (dependency: string) => dependency !== job,
    );

    // act
    const violations = ValidateReleaseWorkflowSigningPolicy(stringify(workflow), forgeSource);

    // assert
    expect(violations).toContain(
      'Publication must require the release identity, source verification and every native build.',
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
