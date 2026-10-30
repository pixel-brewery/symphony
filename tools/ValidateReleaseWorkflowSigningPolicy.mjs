// #region Imports

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { parse } from 'yaml';

// #endregion

const signingSecrets = [
  'APPLE_SIGNING_IDENTITY',
  'MACOS_CERTIFICATE_BASE64',
  'MACOS_CERTIFICATE_PASSWORD',
  'APPLE_API_KEY_BASE64',
  'APPLE_API_KEY_ID',
  'APPLE_API_ISSUER',
  'WINDOWS_CERTIFICATE_BASE64',
  'WINDOWS_CERTIFICATE_PASSWORD',
];

/**
 * Validates that desktop signing remains an optional, platform-scoped release capability.
 *
 * @param {string} workflowSource GitHub Actions release workflow source.
 * @param {string} forgeSource Electron Forge configuration source.
 * @returns {string[]} Human-readable policy violations.
 * @public
 */
export function ValidateReleaseWorkflowSigningPolicy(workflowSource, forgeSource) {
  const violations = [];
  let workflow;

  try {
    workflow = parse(workflowSource);
  } catch (error) {
    return [`The release workflow is not valid YAML: ${String(error)}`];
  }

  const jobs = workflow?.jobs ?? {};
  const configureSteps = jobs.configure?.steps ?? [];
  const verificationSteps = jobs.verify?.steps ?? [];
  const macosSteps = jobs.macos?.steps ?? [];
  const windowsSteps = jobs.windows?.steps ?? [];
  const linuxSteps = jobs.linux?.steps ?? [];
  const publishSteps = jobs.publish?.steps ?? [];
  const allSteps = Object.values(jobs).flatMap((job) => job?.steps ?? []);
  if (workflow.env?.GH_TOKEN || workflow.env?.GITHUB_TOKEN) {
    violations.push('Repository credentials must be scoped to the steps that need them.');
  }
  for (const job of Object.values(jobs)) {
    if (job?.env?.GH_TOKEN || job?.env?.GITHUB_TOKEN) {
      violations.push('Repository credentials must be scoped to the steps that need them.');
    }
    for (const step of job?.steps ?? []) {
      if (step.uses && !/^actions\/[a-z-]+@[a-f0-9]{40}$/u.test(step.uses)) {
        violations.push('Release actions must use an immutable official Actions commit.');
      }
      if (
        step.uses?.startsWith('actions/checkout@') &&
        step.with?.['persist-credentials'] !== false
      ) {
        violations.push('Release checkouts must not persist repository credentials.');
      }
      if (/secrets\.[A-Z_]*TOKEN/u.test(JSON.stringify(step.env ?? {}))) {
        violations.push('Release dependencies must use the short-lived package-read job token.');
      }
    }
  }
  const publicationGuard = jobs.configure?.if ?? '';
  const publicationPreflight =
    configureSteps.find(
      (step) => step.name === 'Require the public release repository and configured update site',
    )?.run ?? '';
  if (
    !publicationGuard.includes("github.repository_id == '1440122208'") ||
    !publicationGuard.includes("github.ref == 'refs/heads/main'") ||
    publicationGuard.includes('github.event.repository.private') ||
    !publicationPreflight.includes("repository.full_name !== 'pixel-brewery/symphony'") ||
    !publicationPreflight.includes('|| repository.private ||') ||
    publicationPreflight.indexOf('repository.private') > publicationPreflight.indexOf('/pages"')
  ) {
    violations.push('Desktop publication must require the transferred public main repository.');
  }
  if (
    !publicationGuard.includes("github.event_name == 'push'") ||
    !publicationGuard.includes("github.event_name == 'workflow_dispatch'") ||
    Object.keys(workflow.on ?? {}).some((event) => !['push', 'workflow_dispatch'].includes(event))
  ) {
    violations.push('Release app credentials must be restricted to trusted main release events.');
  }
  if (
    !['configure', 'macos', 'windows', 'linux'].every((job) =>
      jobs.publish?.needs?.includes(job),
    ) ||
    jobs.publish?.if !== undefined
  ) {
    violations.push('Publication must require every successful native build and release identity.');
  }
  if (
    JSON.stringify(jobs.verify?.strategy?.matrix?.os) !==
    JSON.stringify(['ubuntu-latest', 'macos-latest', 'windows-latest'])
  ) {
    violations.push('The prepared release must pass verification on all three operating systems.');
  }
  if (
    !['yarn playwright install chromium', 'yarn e2e', 'yarn forge:package'].every((command) =>
      verificationSteps.some(
        (step) => step.run === command && step.if === "matrix.os == 'macos-latest'",
      ),
    )
  ) {
    violations.push(
      'Release verification must include the macOS Electron and package smoke gates.',
    );
  }
  const repeatedVersionResolution = publishSteps.some((step) =>
    step.run?.includes('yarn release:nx'),
  );
  const preparedReleaseVerification = publishSteps.find((step) =>
    step.run?.includes('git bundle verify'),
  );
  if (
    repeatedVersionResolution ||
    !preparedReleaseVerification?.run?.includes('"${RELEASE_COMMIT}^"') ||
    !preparedReleaseVerification.run.includes('package.json|yarn.lock|CHANGELOG.md') ||
    !preparedReleaseVerification.run.includes('"$RELEASE_COMMIT"')
  ) {
    violations.push(
      'Publication must use the one metadata-only release commit prepared from its source.',
    );
  }
  const appTokenSteps = allSteps.filter((step) =>
    step.uses?.startsWith('actions/create-github-app-token@'),
  );
  const appTokenStep = publishSteps.find((step) => step.id === 'release-app-token');
  const appConfigurationStep = publishSteps.find(
    (step) => step.name === 'Require the release app configuration',
  );
  const publicationRecheck = publishSteps.find(
    (step) => step.name === 'Recheck the release publication preconditions',
  );
  const releasePushStep = publishSteps.find(
    (step) => step.name === 'Publish the release commit and tag',
  );
  const expectedAppInputs = {
    'app-id': '${{ vars.RELEASE_APP_ID }}',
    'private-key': '${{ secrets.RELEASE_APP_PRIVATE_KEY }}',
    owner: '${{ github.repository_owner }}',
    repositories: '${{ github.event.repository.name }}',
    'permission-contents': 'write',
  };
  if (jobs.publish?.environment !== 'release-main') {
    violations.push(
      'The release app private key must be isolated in the release-main environment.',
    );
  }
  if (
    appTokenSteps.length !== 1 ||
    appTokenSteps[0] !== appTokenStep ||
    appTokenStep?.uses !==
      'actions/create-github-app-token@64ab729a6294000f5aa4a4bc0b73d1f32bc45510' ||
    appTokenStep.if !== undefined ||
    Object.keys(appTokenStep.with ?? {}).length !== Object.keys(expectedAppInputs).length ||
    !Object.entries(expectedAppInputs).every(([key, value]) => appTokenStep.with?.[key] === value)
  ) {
    violations.push(
      'The release app token must be short-lived and contents-only for this repository.',
    );
  }
  if (
    appConfigurationStep?.env?.RELEASE_APP_ID !== '${{ vars.RELEASE_APP_ID }}' ||
    appConfigurationStep?.env?.HAS_RELEASE_APP_PRIVATE_KEY !==
      "${{ secrets.RELEASE_APP_PRIVATE_KEY != '' }}" ||
    appConfigurationStep.if !== undefined ||
    !appConfigurationStep.run?.includes('[ -z "$RELEASE_APP_ID" ]') ||
    !appConfigurationStep.run.includes('[ "$HAS_RELEASE_APP_PRIVATE_KEY" != \'true\' ]') ||
    !appConfigurationStep.run.includes('exit 1')
  ) {
    violations.push(
      'Missing release app configuration must stop publication before token creation.',
    );
  }
  const mintIndex = publishSteps.indexOf(appTokenStep);
  const recheckIndex = publishSteps.indexOf(publicationRecheck);
  const lastPreparationIndex = Math.max(
    publishSteps.indexOf(preparedReleaseVerification),
    publishSteps.findIndex((step) => step.run === 'node tools/prepare-update-publication.mjs'),
    publishSteps.findIndex((step) => step.name === 'Write the release notes'),
  );
  if (
    recheckIndex <= lastPreparationIndex ||
    !publicationRecheck?.run?.includes('gh api repositories/1440122208') ||
    !publicationRecheck.run.includes('git fetch origin main --tags') ||
    !publicationRecheck.run.includes('"$(git rev-parse origin/main)" != "$GITHUB_SHA"') ||
    publishSteps.indexOf(appConfigurationStep) !== recheckIndex + 1 ||
    mintIndex !== recheckIndex + 2 ||
    publishSteps.indexOf(releasePushStep) !== mintIndex + 1
  ) {
    violations.push(
      'Create the release app token only after verification, immediately before the atomic push.',
    );
  }
  const serializedWorkflow = JSON.stringify(workflow);
  if (
    (serializedWorkflow.match(/secrets\.RELEASE_APP_PRIVATE_KEY\b/gu) ?? []).length !== 2 ||
    (serializedWorkflow.match(/steps\.release-app-token\.outputs\.token\b/gu) ?? []).length !== 1 ||
    releasePushStep?.env?.RELEASE_PUSH_TOKEN !== '${{ steps.release-app-token.outputs.token }}' ||
    Object.keys(releasePushStep?.env ?? {}).length !== 1 ||
    releasePushStep?.if !== undefined ||
    !releasePushStep?.run?.includes('[ -z "$RELEASE_PUSH_TOKEN" ]') ||
    !releasePushStep.run.includes('"$RELEASE_PUSH_TOKEN" | base64 -w0)') ||
    !releasePushStep.run.includes('echo "::add-mask::${auth_header}"') ||
    !releasePushStep.run.includes(
      'push --atomic origin "HEAD:refs/heads/main" "refs/tags/${RELEASE_TAG}"',
    ) ||
    /\bgh\s/u.test(releasePushStep.run)
  ) {
    violations.push('Only the atomic main/tag Git push may receive the release app token.');
  }
  if (
    allSteps.some(
      (step) =>
        /\bgh\s+(?:api|release|workflow)\b/u.test(step.run ?? '') &&
        step.env?.GH_TOKEN !== '${{ github.token }}',
    )
  ) {
    violations.push(
      'Release API, Pages and workflow dispatch calls must keep the repository job token.',
    );
  }
  const macosSigningStep = macosSteps.find((step) => step.id === 'macos-signing');
  const windowsSigningStep = windowsSteps.find(
    (step) => step.name === 'Import signing certificate when available',
  );

  if (configureSteps.some((step) => /require.*credential/iu.test(step.name ?? ''))) {
    violations.push('The configure job must not require signing credentials.');
  }
  if (!macosSigningStep) {
    violations.push('The macOS job must own the optional macOS signing step.');
  }
  if (!windowsSigningStep) {
    violations.push('The Windows job must own the optional Windows signing step.');
  }

  for (const secret of signingSecrets) {
    const expectedReference = `\${{ secrets.${secret} }}`;
    const owner = secret.startsWith('WINDOWS_') ? windowsSigningStep : macosSigningStep;
    if (owner?.env?.[secret] !== expectedReference) {
      violations.push(`${secret} must be scoped to its platform signing step.`);
    }
  }

  if (jobs.macos?.env?.APPLE_SIGNING_IDENTITY !== undefined) {
    violations.push('Apple signing credentials must not be exposed at macOS job scope.');
  }
  if (jobs.windows?.env?.WINDOWS_CERTIFICATE_BASE64 !== undefined) {
    violations.push('Windows signing credentials must not be exposed at Windows job scope.');
  }

  for (const platform of ['macos', 'windows', 'linux']) {
    if (jobs[platform]?.env?.RELEASE_VERSION !== '${{ needs.configure.outputs.version }}') {
      violations.push(`${platform} must receive the resolved release version.`);
    }
  }

  if (JSON.stringify(jobs.macos?.strategy?.matrix?.arch) !== JSON.stringify(['arm64'])) {
    violations.push('The macOS release matrix must build only ARM64.');
  }
  const windowsMakeStep = windowsSteps.find((step) => step.run?.includes('electron-forge make'));
  if (windowsMakeStep?.run !== 'yarn electron-forge make --arch=arm64') {
    violations.push('The Windows release job must build only ARM64.');
  }
  const linuxMakeStep = linuxSteps.find((step) => step.run?.includes('electron-forge make'));
  if (linuxMakeStep?.run !== 'yarn electron-forge make --arch=arm64') {
    violations.push('The Linux release job must build only ARM64.');
  }
  const expectedUploads = [
    [macosSteps, 'update-darwin-${{ matrix.arch }}', '.dmg'],
    [windowsSteps, 'update-win32-arm64', 'SymphonySetup.exe'],
    [linuxSteps, 'update-linux-arm64', '.deb'],
  ];
  for (const [steps, expectedName, expectedSuffix] of expectedUploads) {
    const upload = steps.find((step) => step.uses?.startsWith('actions/upload-artifact@'));
    if (upload?.with?.name !== expectedName || !upload?.with?.path?.endsWith(expectedSuffix)) {
      violations.push(`Release build artifact ${expectedName} must contain only its installer.`);
    }
  }

  const windowsSetupNodeIndex = windowsSteps.findIndex((step) =>
    step.uses?.startsWith('actions/setup-node@'),
  );
  const windowsCorepackIndex = windowsSteps.findIndex((step) => step.run === 'corepack enable');
  if (windowsSetupNodeIndex < 0 || windowsCorepackIndex <= windowsSetupNodeIndex) {
    violations.push('Windows must activate Corepack after selecting its Node.js runtime.');
  }
  if (windowsSteps[windowsSetupNodeIndex]?.with?.cache !== undefined) {
    violations.push('Windows setup-node caching must not invoke the preinstalled Yarn 1 binary.');
  }

  const macosBundleVerification = macosSteps.find(
    (step) => step.name === 'Verify macOS application and disk image',
  );
  if (
    macosBundleVerification?.if !== undefined ||
    !macosBundleVerification?.run?.includes('codesign --verify --deep --strict') ||
    !macosBundleVerification.run.includes('hdiutil verify')
  ) {
    violations.push('Every macOS build must verify its app signature and DMG before upload.');
  }
  const macosDeveloperIdVerification = macosSteps.find(
    (step) => step.name === 'Verify Developer ID signature',
  );
  const macosAdHocVerification = macosSteps.find(
    (step) => step.name === 'Verify launchable ad-hoc signature',
  );
  if (
    macosAdHocVerification?.if !== "steps.macos-signing.outputs.signed != 'true'" ||
    !macosAdHocVerification?.run?.includes('Signature=adhoc') ||
    !macosAdHocVerification.run.includes('flags=.*runtime')
  ) {
    violations.push('Ad-hoc macOS builds must reject Hardened Runtime before publication.');
  }
  if (macosDeveloperIdVerification?.if !== "steps.macos-signing.outputs.signed == 'true'") {
    violations.push('Developer ID verification must run only when Apple signing is configured.');
  }
  const windowsVerification = windowsSteps.find(
    (step) => step.name === 'Verify installer signature',
  );
  if (windowsVerification?.if !== "env.SYMPHONY_SIGNED == 'true'") {
    violations.push('Windows signature verification must run only for a signed build.');
  }

  if (!linuxSteps.some((step) => step.name === 'Report Linux package signing mode')) {
    violations.push('The Linux job must disclose that its packages are unsigned.');
  }
  const publishedAssetStep = publishSteps.find(
    (step) => step.name === 'Confirm every advertised asset is published',
  );
  if (
    !publishedAssetStep?.run?.includes('gh api') ||
    !publishedAssetStep.run.includes('VerifyPublishedReleaseAssets.mjs') ||
    /curl[\s\S]*--head/u.test(publishedAssetStep.run)
  ) {
    violations.push(
      'Published release assets must be verified through the authenticated GitHub API.',
    );
  }
  const releasePreparationStep = configureSteps.find((step) => step.id === 'release');
  if (
    !releasePreparationStep?.run?.includes('yarn prettier --write CHANGELOG.md') ||
    !releasePreparationStep.run.includes('git commit --amend --no-edit') ||
    !releasePreparationStep.run.includes('git tag --force --annotate')
  ) {
    violations.push('Generated release changelogs must be formatted before publishing the tag.');
  }
  for (const platform of ['macos', 'windows']) {
    const steps = jobs[platform]?.steps ?? [];
    const installIndex = steps.findIndex((step) => step.name === 'Install dependencies');
    const signingIndex = steps.indexOf(
      platform === 'macos' ? macosSigningStep : windowsSigningStep,
    );
    if (installIndex < 0 || signingIndex <= installIndex) {
      violations.push(
        `${platform} signing credentials must be configured after dependency installation.`,
      );
    }
  }
  if (!workflowSource.includes('Install unsigned artifacts only if you trust this repository')) {
    violations.push('GitHub Release notes must disclose the unsigned-install trust decision.');
  }
  if (!/const osxNotarize =\s+appleSigningIdentity &&/u.test(forgeSource)) {
    violations.push('Apple notarization must remain disabled when macOS signing is disabled.');
  }
  if (
    !forgeSource.includes("identity: '-'") ||
    !forgeSource.includes('identityValidation: false') ||
    !forgeSource.includes('optionsForFile: () => ({ hardenedRuntime: false })') ||
    !forgeSource.includes('continueOnError: false')
  ) {
    violations.push(
      'macOS builds without Apple credentials must receive a launchable complete ad-hoc signature.',
    );
  }
  if (!forgeSource.includes('new MakerDMG')) {
    violations.push('The macOS release matrix must include a DMG installer.');
  }
  if (
    /^\s*new MakerZIP\(/mu.test(forgeSource) ||
    !forgeSource.includes("// import { MakerZIP } from '@electron-forge/maker-zip';") ||
    !forgeSource.includes("// new MakerZIP({}, ['darwin', 'linux', 'win32']),")
  ) {
    violations.push('ZIP release packaging must remain present but commented out.');
  }

  return violations;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const workflowSource = readFileSync(resolve('.github/workflows/release.yml'), 'utf8');
  const forgeSource = readFileSync(resolve('forge.config.mjs'), 'utf8');
  const violations = ValidateReleaseWorkflowSigningPolicy(workflowSource, forgeSource);

  if (violations.length > 0) {
    process.stderr.write(`${violations.join('\n')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(
      'Release workflow signing credentials are optional and platform-scoped.\n',
    );
  }
}
