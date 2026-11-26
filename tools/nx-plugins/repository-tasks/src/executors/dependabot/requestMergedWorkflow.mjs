// #region Imports

import { requestDependabotGitHub } from './requestDependabotGitHub.mjs';

// #endregion

const repository = 'pixel-brewery/symphony';
const repositoryId = 1440122208;
const repositoryPath = `repos/${repository}`;
const shaPattern = /^[0-9a-f]{40}$/u;
const profiles = {
  verification: {
    name: 'Repository Quality',
    file: 'ci.yml',
    failure:
      'Verification request failed; inspect the original merge and verification runs before retrying.',
    inputs: (sourceSha) => ({ expected_head_sha: sourceSha }),
  },
  release: {
    name: 'Continuous Desktop Release',
    file: 'release.yml',
    failure: 'Release request failed; inspect the original merge and release runs before retrying.',
    inputs: (sourceSha) => ({ specifier: 'patch', source_sha: sourceSha }),
  },
  pages: {
    name: 'Publish Symphony Downloads',
    file: 'publish-pages.yml',
    failure: 'Pages request failed; inspect the original merge and Pages runs before retrying.',
    inputs: (sourceSha) => ({ expected_head_sha: sourceSha }),
  },
};

/**
 * Continues an existing main workflow after a verified native-token dependency merge.
 *
 * @param kind - One of the three fixed repository-owned continuation profiles.
 * @param context - Trusted event, immutable repository identity and exact merged source.
 * @param dependencies - Optional GitHub request boundary for isolated verification.
 * @returns The requested, retained, unnecessary or superseded source result.
 * @throws An Error with a controlled diagnostic for invalid or incomplete evidence.
 * @remarks This owner installs no dependencies and loads no PR code. An existing
 * attempt, including a failed or cancelled one, is retained. Pages preserves the
 * existing push-path policy and never advances release channels through dispatch.
 * Only exact main push/dispatch records deduplicate a complete inventory; valid
 * unrelated runs are ignored, while malformed run IDs or attempts fail closed.
 *
 * @internal
 */
export async function requestMergedWorkflow(kind, context, dependencies = {}) {
  if (!Object.hasOwn(profiles, kind)) throw new Error('Unsupported dependency continuation.');
  const profile = profiles[kind];
  const workflowPath = `.github/workflows/${profile.file}`;
  const fail = () => new Error(profile.failure);
  if (
    !['workflow_run', 'workflow_dispatch', 'schedule'].includes(context?.eventName) ||
    context?.repository !== repository ||
    ![repositoryId, String(repositoryId)].includes(context?.repositoryId) ||
    typeof context?.sourceSha !== 'string' ||
    !shaPattern.test(context.sourceSha)
  )
    throw fail();
  const sourceSha = context.sourceSha;
  const boundary = dependencies.request ?? requestDependabotGitHub;
  const request = async (method, endpoint, body) => {
    try {
      return await boundary(method, endpoint, body);
    } catch {
      throw fail();
    }
  };
  const metadata = await request('GET', `repositories/${repositoryId}`);
  if (
    !canonicalRepository(metadata) ||
    metadata.default_branch !== 'main' ||
    metadata.private !== false ||
    metadata.fork !== false
  )
    throw fail();
  const mainPath = `${repositoryPath}/branches/main`;
  const main = await request('GET', mainPath);
  if (main?.name !== 'main' || !shaPattern.test(main?.commit?.sha ?? '')) throw fail();
  if (main.commit.sha !== sourceSha) return { status: 'superseded', sourceSha };
  if (kind === 'pages') {
    const commit = await request(
      'GET',
      `${repositoryPath}/commits/${sourceSha}?per_page=100&page=1`,
    );
    if (
      commit?.sha !== sourceSha ||
      !Array.isArray(commit.parents) ||
      commit.parents.length < 1 ||
      commit.parents.length > 2 ||
      commit.parents.some((parent) => !shaPattern.test(parent?.sha ?? '')) ||
      !Array.isArray(commit.files) ||
      !commit.files.length ||
      commit.files.length >= 100 ||
      commit.files.some(
        (file) =>
          !validPath(file?.filename) ||
          (file.previous_filename !== undefined && !validPath(file.previous_filename)),
      )
    )
      throw fail();
    if (
      !commit.files.some(
        (file) =>
          pagesPath(file.filename) ||
          (file.previous_filename !== undefined && pagesPath(file.previous_filename)),
      )
    )
      return { status: 'not-required', sourceSha };
  }
  const workflow = await request('GET', `${repositoryPath}/actions/workflows/${profile.file}`);
  if (
    !Number.isSafeInteger(workflow?.id) ||
    workflow.id <= 0 ||
    workflow.path !== workflowPath ||
    workflow.name !== profile.name ||
    workflow.state !== 'active'
  )
    throw fail();
  const workflowEndpoint = `${repositoryPath}/actions/workflows/${workflow.id}`;
  const runs = await request('GET', `${workflowEndpoint}/runs?head_sha=${sourceSha}&per_page=100`);
  if (
    !Number.isSafeInteger(runs?.total_count) ||
    runs.total_count < 0 ||
    runs.total_count > 100 ||
    !Array.isArray(runs.workflow_runs) ||
    runs.workflow_runs.length !== runs.total_count ||
    runs.workflow_runs.some(
      (run) =>
        !Number.isSafeInteger(run?.id) ||
        run.id <= 0 ||
        !Number.isSafeInteger(run.run_attempt) ||
        run.run_attempt <= 0,
    )
  )
    throw fail();
  const existingRun = runs.workflow_runs.find((run) =>
    canonicalRun(run, workflow.id, workflowPath, sourceSha),
  );
  if (existingRun) return { status: 'already-requested', sourceSha, runId: existingRun.id };
  const currentMain = await request('GET', mainPath);
  if (currentMain?.name !== 'main' || !shaPattern.test(currentMain?.commit?.sha ?? ''))
    throw fail();
  if (currentMain.commit.sha !== sourceSha) return { status: 'superseded', sourceSha };
  await request('POST', `${workflowEndpoint}/dispatches`, {
    ref: 'main',
    inputs: profile.inputs(sourceSha),
  });
  return { status: 'requested', sourceSha };
}

function canonicalRepository(value) {
  return value?.id === repositoryId && value?.full_name === repository;
}

function canonicalRun(run, workflowId, path, sourceSha) {
  return (
    Number.isSafeInteger(run?.id) &&
    run.id > 0 &&
    Number.isSafeInteger(run.run_attempt) &&
    run.run_attempt > 0 &&
    run.workflow_id === workflowId &&
    run.head_sha === sourceSha &&
    run.head_branch === 'main' &&
    ['push', 'workflow_dispatch'].includes(run.event) &&
    typeof run.path === 'string' &&
    (run.path === path || run.path === `${path}@refs/heads/main`) &&
    canonicalRepository(run.repository) &&
    canonicalRepository(run.head_repository)
  );
}

function validPath(path) {
  return (
    typeof path === 'string' &&
    path.length > 0 &&
    path.length <= 512 &&
    !path.includes('\\') &&
    ![...path].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127,
    ) &&
    path.split('/').every((segment) => segment && segment !== '.' && segment !== '..')
  );
}

function pagesPath(path) {
  return (
    [
      '.github/workflows/publish-pages.yml',
      'resources/download-page/downloads.css',
      'resources/download-page/hero.webp',
      'resources/icons/png/app/symphony-32.png',
      'resources/icons/png/app/symphony-192.png',
      'tools/VerifyPublishedReleaseAssets.mjs',
    ].includes(path) || /^tools\/[^/]*(?:Download|Pages)[^/]*[.]mjs$/u.test(path)
  );
}
