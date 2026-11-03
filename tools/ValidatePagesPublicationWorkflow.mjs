// #region Imports

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'yaml';

// #endregion

/**
 * Checks the trust, durable storage and destructive migration gates of Pages publication.
 *
 * @param {{releaseSource: string, promotionSource: string, pagesSource: string, refreshSource: string}} sources Workflow YAML sources.
 * @returns {string[]} Publication contract violations.
 * @public
 */
export function ValidatePagesPublicationWorkflow(sources) {
  const failures = [];
  let release;
  let promotion;
  let pages;
  let refresh;
  try {
    release = parse(sources.releaseSource);
    promotion = parse(sources.promotionSource);
    pages = parse(sources.pagesSource);
    refresh = parse(sources.refreshSource);
  } catch {
    return ['Download publication workflows must be valid YAML.'];
  }
  const publication = pages?.jobs?.publish;
  const steps = publication?.steps ?? [];
  const indexOf = (name) => steps.findIndex((step) => step.name === name);
  const orderedNames = [
    'Preserve the former Pages history in GitHub Releases',
    'Reconstruct immutable version metadata from Releases',
    'Build the download page and installer feeds',
    'Verify the requested channel selection',
    'Require Actions as the Pages publishing source',
    'Upload the complete Pages artifact',
    'Deploy the complete download site',
    'Verify every published page, feed and historical file',
    'Remove the migrated publication branch',
  ];
  const indices = orderedNames.map(indexOf);
  if (
    indices.some((index, position) => index < 0 || (position > 0 && index <= indices[position - 1]))
  ) {
    failures.push(
      'Preservation, deployment and every-file verification must precede branch removal.',
    );
  }
  if (
    steps.some(
      (step) =>
        step['continue-on-error'] ||
        (orderedNames.includes(step.name) && step.if && step.name !== orderedNames.at(-1)),
    )
  ) {
    failures.push('Publication and migration gates must not be skipped or allowed to fail.');
  }
  if (
    !publication?.if?.includes("github.ref == 'refs/heads/main'") ||
    !publication.if.includes("github.repository_id == '1440122208'") ||
    !publication.if.includes("github.repository == 'pixel-brewery/symphony'")
  ) {
    failures.push(
      'Only the canonical main repository may publish downloads or remove the old branch.',
    );
  }
  if (
    publication?.environment?.name !== 'github-pages' ||
    publication.permissions?.['pages'] !== 'write' ||
    publication.permissions?.['id-token'] !== 'write' ||
    publication.permissions?.['contents'] !== 'write'
  ) {
    failures.push(
      'Pages publication must use its deployment environment and explicit job permissions.',
    );
  }
  if (
    publication?.concurrency?.group !== 'desktop-update-publication' ||
    publication.concurrency['cancel-in-progress'] !== false
  ) {
    failures.push(
      'Pages, releases and channel selection must serialize without cancelling migration.',
    );
  }
  const migration = steps[indexOf(orderedNames[0])];
  const cleanup = steps[indexOf(orderedNames.at(-1))];
  if (
    !migration?.run?.includes('PreparePagesHistory.mjs') ||
    !migration.run.includes('gh release upload') ||
    !migration.run.includes('gh release download') ||
    !migration.run.includes('cmp out/symphony-pages-history.json')
  ) {
    failures.push('Historical bytes must be archived in Releases and downloaded for verification.');
  }
  if (
    !cleanup?.if?.includes("steps.migration.outputs.origin-commit != ''") ||
    !cleanup.run?.includes('"$current_commit" != "$MIGRATED_COMMIT"') ||
    !cleanup.run.includes(
      '--force-with-lease="refs/heads/gh-pages:${MIGRATED_COMMIT}" origin :refs/heads/gh-pages',
    )
  ) {
    failures.push('Branch removal must require an unchanged archived revision.');
  }
  const upload = steps.find((step) => step.uses?.startsWith('actions/upload-pages-artifact@'));
  const deploy = steps.find((step) => step.uses?.startsWith('actions/deploy-pages@'));
  if (
    upload?.with?.path !== 'out/pages' ||
    !deploy ||
    steps.some((step) => step.uses && !/^actions\/[a-z-]+@[a-f0-9]{40}$/u.test(step.uses))
  ) {
    failures.push('Only the complete static site may be deployed with immutable official Actions.');
  }
  for (const [workflow, owner] of [
    [release, 'publish'],
    [promotion, 'promote'],
  ]) {
    const site = workflow?.jobs?.['update-site'];
    const dependencies = Array.isArray(site?.needs) ? site.needs : [site?.needs];
    if (
      !dependencies.includes(owner) ||
      site?.uses !== './.github/workflows/publish-pages.yml' ||
      !site?.with?.['stable-version']
    ) {
      failures.push(
        'Every release and Stable selection must refresh Pages after its successful owner.',
      );
    }
  }
  const releaseSteps = release?.jobs?.publish?.steps ?? [];
  const create = releaseSteps.findIndex((step) => step.name === 'Publish the GitHub release');
  const verify = releaseSteps.findIndex(
    (step) => step.name === 'Confirm every advertised asset is published',
  );
  const makePublic = releaseSteps.findIndex(
    (step) => step.name === 'Publish the verified release and select Stable',
  );
  const staged = releaseSteps.findIndex((step) => step.name === 'Verify the staged release assets');
  if (
    create < 0 ||
    staged <= create ||
    makePublic <= staged ||
    verify <= makePublic ||
    !releaseSteps[create]?.run?.includes('--draft') ||
    !releaseSteps[create].run.includes('/manifest.json') ||
    !releaseSteps[create].run.includes('/shared/symphony.ico') ||
    !releaseSteps[staged]?.run?.includes('--draft') ||
    !releaseSteps[staged]?.run?.includes('/releases/${STAGED_RELEASE_ID}') ||
    !releaseSteps[makePublic]?.run?.includes('-F draft=false -f make_latest=true')
  ) {
    failures.push(
      'Only verified installers with durable metadata may become public and select Stable.',
    );
  }
  const dispatcher = refresh?.jobs?.refresh;
  if (
    !refresh?.on?.release?.types?.includes('published') ||
    !refresh?.on?.release?.types?.includes('edited') ||
    dispatcher?.permissions?.actions !== 'write' ||
    !dispatcher?.steps?.some(
      (step) =>
        step.run === 'gh workflow run publish-pages.yml --ref main --repo "$GITHUB_REPOSITORY"',
    )
  ) {
    failures.push(
      'Manual release publication and edits must dispatch the trusted main Pages workflow.',
    );
  }
  if (
    /git (?:fetch|push|worktree)[^\n]*gh-pages/u.test(
      sources.releaseSource + sources.promotionSource,
    )
  ) {
    failures.push(
      'Release and Stable selection must not depend on the retired publication branch.',
    );
  }
  return failures;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  const failures = ValidatePagesPublicationWorkflow({
    releaseSource: readFileSync('.github/workflows/release.yml', 'utf8'),
    promotionSource: readFileSync('.github/workflows/promote-release.yml', 'utf8'),
    pagesSource: readFileSync('.github/workflows/publish-pages.yml', 'utf8'),
    refreshSource: readFileSync('.github/workflows/refresh-downloads.yml', 'utf8'),
  });
  if (failures.length) {
    process.stderr.write(`${failures.join('\n')}\n`);
    process.exitCode = 1;
  } else {
    process.stdout.write(
      'Pages publication preserves history and verifies deployment before branch removal.\n',
    );
  }
}
