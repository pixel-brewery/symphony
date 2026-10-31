// #region Imports

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'yaml';
import { mergeDependabotPullRequest } from './mergeDependabotPullRequest.mjs';

// #endregion

const repositoryPath = 'repos/pixel-brewery/symphony';
const mainSha = 'a'.repeat(40);
const headSha = 'b'.repeat(40);
const mergeSha = 'c'.repeat(40);
const changedSha = 'd'.repeat(40);
const context = {
  eventName: 'workflow_run',
  repository: 'pixel-brewery/symphony',
  repositoryId: 1440122208,
  defaultBranch: 'main',
  runId: 202,
  runAttempt: 2,
};
const jobsPath = `${repositoryPath}/actions/runs/202/attempts/2/jobs?per_page=100&page=`;
const pullRequestPath = `${repositoryPath}/pulls/7`;
const runPath = `${repositoryPath}/actions/runs/202`;
const mainPath = `${repositoryPath}/branches/main`;
const requiredJobNames = [
  'Agents, Format, Lint, Typecheck, Test and Build (ubuntu-latest)',
  'Agents, Format, Lint, Typecheck, Test and Build (macos-latest)',
  'Agents, Format, Lint, Typecheck, Test and Build (windows-latest)',
  'Electron E2E',
  'Package smoke test',
];

function controlled(repositoryName = 'pixel-brewery/symphony', defaultBranch = 'main') {
  const repositoryPath = `repos/${repositoryName}`;
  const pullRequestPath = `${repositoryPath}/pulls/7`;
  const runPath = `${repositoryPath}/actions/runs/202`;
  const mainPath = `${repositoryPath}/branches/${encodeURIComponent(defaultBranch)}`;
  const jobsPath = `${repositoryPath}/actions/runs/202/attempts/2/jobs?per_page=100&page=`;
  const repository = {
    id: 1440122208,
    name: 'symphony',
    fork: false,
    full_name: repositoryName,
    default_branch: defaultBranch,
  };
  const jobs = requiredJobNames.map((name, index) => ({
    id: index + 1,
    run_id: 202,
    name,
    status: 'completed',
    conclusion: 'success',
  }));
  const records = {
    repository,
    workflow: { id: 101, name: 'Repository Quality', path: '.github/workflows/ci.yml' },
    run: {
      id: 202,
      run_attempt: 2,
      event: 'pull_request',
      status: 'completed',
      conclusion: 'success',
      workflow_id: 101,
      name: 'Repository Quality',
      path: '.github/workflows/ci.yml',
      repository,
      head_repository: repository,
      head_sha: headSha,
      pull_requests: [{ number: 7 }],
    },
    pullRequest: {
      number: 7,
      state: 'open',
      draft: false,
      merged: false,
      user: { login: 'dependabot[bot]', type: 'Bot' },
      head: { sha: headSha, repo: repository },
      base: { ref: defaultBranch, sha: mainSha, repo: repository },
    },
    main: { name: defaultBranch, commit: { sha: mainSha } },
    comparison: { behind_by: 0, merge_base_commit: { sha: mainSha } },
    jobs,
    jobPages: [{ total_count: jobs.length, jobs }],
    merge: { merged: true, sha: mergeSha },
  };
  const reads = new Map();
  const request = vi.fn((method, endpoint) => {
    if (records.failure?.method === method && records.failure?.endpoint === endpoint)
      throw new Error('Sensitive upstream output must not reach the caller.');

    if (method === 'PUT' && endpoint === `${pullRequestPath}/merge`)
      return structuredClone(records.merge);

    if (method !== 'GET') throw new Error('Unexpected test request.');

    const count = (reads.get(endpoint) ?? 0) + 1;

    reads.set(endpoint, count);

    if (endpoint === 'repositories/1440122208') return structuredClone(records.repository);

    if (endpoint === `${repositoryPath}/actions/workflows/ci.yml`)
      return structuredClone(records.workflow);

    if (endpoint === runPath)
      return structuredClone(count > 1 ? (records.nextRun ?? records.run) : records.run);

    if (endpoint === pullRequestPath)
      return structuredClone(
        count > 1 ? (records.nextPullRequest ?? records.pullRequest) : records.pullRequest,
      );

    if (endpoint === mainPath)
      return structuredClone(count > 1 ? (records.nextMain ?? records.main) : records.main);

    if (endpoint === `${repositoryPath}/compare/${mainSha}...${headSha}`)
      return structuredClone(records.comparison);

    if (endpoint.startsWith(jobsPath))
      return structuredClone(records.jobPages[Number(endpoint.slice(jobsPath.length)) - 1]);

    throw new Error('Unexpected test endpoint.');
  });

  return { records, request };
}

function writes(request) {
  return request.mock.calls.filter(([method]) => method !== 'GET');
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('Dependabot pull request merge', () => {
  it('matches the five jobs emitted by CI and keeps macOS acceptance behind the full source matrix', () => {
    // arrange
    const workflow = parse(readFileSync('.github/workflows/ci.yml', 'utf8'));
    const quality = workflow.jobs.quality;

    // act
    const names = [
      ...quality.strategy.matrix.os.map((os: string) =>
        quality.name.replace('${{ matrix.os }}', os),
      ),
      workflow.jobs['electron-e2e'].name,
      workflow.jobs.package.name,
    ];

    // assert
    expect(quality.strategy.matrix.os).toEqual(['ubuntu-latest', 'macos-latest', 'windows-latest']);
    expect(quality.strategy['fail-fast']).toBe(false);
    expect(quality['runs-on']).toBe('${{ matrix.os }}');
    expect(quality.defaults.run.shell).toBe('bash');
    expect(names).toEqual(requiredJobNames);
    expect(workflow.jobs['electron-e2e'].needs).toBe('quality');
    expect(workflow.jobs.package.needs).toBe('quality');
    expect(workflow.jobs['electron-e2e']['runs-on']).toBe('macos-latest');
    expect(workflow.jobs.package['runs-on']).toBe('macos-latest');
    expect(workflow.permissions).toEqual({ contents: 'read', packages: 'read' });
  });

  it.each([
    { repository: 'contributor-owner/symphony', defaultBranch: 'main' },
    { repository: 'pixel-brewery/symphony', defaultBranch: 'trunk' },
  ])('uses the API-bound owner and default branch: %j', async (identity) => {
    // arrange
    const dependencies = controlled(identity.repository, identity.defaultBranch);

    // act
    const result = await mergeDependabotPullRequest({ ...context, ...identity }, dependencies);

    // assert
    expect(result).toEqual({
      status: 'merged',
      pullRequestNumber: 7,
      sha: mergeSha,
      defaultBranch: identity.defaultBranch,
    });
    expect(writes(dependencies.request)).toEqual([
      [
        'PUT',
        `repos/${identity.repository}/pulls/7/merge`,
        { sha: headSha, merge_method: 'squash' },
      ],
    ]);
  });

  it.each([
    'Bump vitest from 4.0.0 to 5.0.0',
    'Bump typescript-eslint from 8.0.0 to 8.1.0',
    'Bump a dependency from 1.0.0 to 1.0.1',
  ])('merges an eligible update once at its tested SHA: %s', async (title) => {
    // arrange
    const dependencies = controlled();

    dependencies.records.pullRequest.title = title;

    // act
    const result = await mergeDependabotPullRequest(context, dependencies);

    // assert
    expect(result).toEqual({
      status: 'merged',
      pullRequestNumber: 7,
      sha: mergeSha,
      defaultBranch: 'main',
    });
    expect(writes(dependencies.request)).toEqual([
      ['PUT', `${pullRequestPath}/merge`, { sha: headSha, merge_method: 'squash' }],
    ]);
    expect(dependencies.request.mock.calls.slice(-4)).toEqual([
      ['GET', pullRequestPath, undefined],
      ['GET', runPath, undefined],
      ['GET', mainPath, undefined],
      ['PUT', `${pullRequestPath}/merge`, { sha: headSha, merge_method: 'squash' }],
    ]);
    expect(dependencies.request).toHaveBeenCalledWith('GET', `${jobsPath}1`, undefined);
  });

  it('accepts the documented workflow path with a ref suffix while retaining canonical workflow identity', async () => {
    // arrange
    const dependencies = controlled();

    dependencies.records.run.path = '.github/workflows/ci.yml@refs/pull/7/merge';

    // act
    const result = await mergeDependabotPullRequest(context, dependencies);

    // assert
    expect(result.status).toBe('merged');
    expect(writes(dependencies.request)).toHaveLength(1);
  });

  it.each([
    { eventName: 'pull_request' },
    { eventName: 'workflow_dispatch' },
    { runId: undefined },
    { runId: '202/traversal' },
    { runId: Number.MAX_SAFE_INTEGER + 1 },
    { runAttempt: 0 },
    { runAttempt: '2.5' },
  ])('rejects unsupported trigger metadata before any API request: %j', async (override) => {
    // arrange
    const dependencies = controlled();

    // act
    const result = await mergeDependabotPullRequest({ ...context, ...override }, dependencies);

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'unsupported-context' });
    expect(dependencies.request).not.toHaveBeenCalled();
  });

  it.each([
    { id: undefined },
    { name: 'Other workflow' },
    { path: '.github/workflows/ci.yml.lookalike' },
  ])('rejects a different canonical workflow: %j', async (override) => {
    // arrange
    const dependencies = controlled();

    Object.assign(dependencies.records.workflow, override);

    // act
    const result = await mergeDependabotPullRequest(context, dependencies);

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'unexpected-workflow' });
    expect(writes(dependencies.request)).toEqual([]);
  });

  it.each([
    { id: 203 },
    { run_attempt: 1 },
    { run_attempt: 3 },
    { event: 'push' },
    { status: 'in_progress' },
    { conclusion: 'failure' },
    { conclusion: 'skipped' },
    { workflow_id: 102 },
    { name: 'Other workflow' },
    { path: '.github/workflows/other.yml' },
    { path: '.github/workflows/ci.yml.lookalike@main' },
    { path: '.github/workflows/ci.yml@' },
    { repository: { full_name: 'untrusted/symphony' } },
    { head_repository: { full_name: 'untrusted/symphony' } },
    { repository: { id: 1440122209, full_name: 'pixel-brewery/symphony' } },
    { head_repository: { id: 1440122209, full_name: 'pixel-brewery/symphony' } },
    { head_repository: null },
    { head_sha: 'untrusted/branch' },
  ])('rejects an ineligible or superseded workflow run: %j', async (override) => {
    // arrange
    const dependencies = controlled();

    Object.assign(dependencies.records.run, override);

    // act
    const result = await mergeDependabotPullRequest(context, dependencies);

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'ineligible-workflow-run' });
    expect(writes(dependencies.request)).toEqual([]);
  });

  it.each([[undefined], [[]], [[{ number: 7 }, { number: 8 }]], [[{ number: 0 }]], [[null]]])(
    'requires exactly one valid associated pull request: %j',
    async (pullRequests) => {
      // arrange
      const dependencies = controlled();

      dependencies.records.run.pull_requests = pullRequests;

      // act
      const result = await mergeDependabotPullRequest(context, dependencies);

      // assert
      expect(result).toEqual({ status: 'skipped', reason: 'ambiguous-pull-request' });
      expect(writes(dependencies.request)).toEqual([]);
    },
  );

  it.each([
    { number: 8 },
    { state: 'closed' },
    { draft: true },
    { merged: true },
    { user: { login: 'contributor', type: 'User' } },
    { user: { login: 'dependabot', type: 'Bot' } },
    { user: { login: 'dependabot[bot]', type: 'User' } },
    { head: { sha: headSha, repo: { full_name: 'untrusted/symphony' } } },
    {
      head: {
        sha: headSha,
        repo: { id: 1440122209, full_name: 'pixel-brewery/symphony' },
      },
    },
    { head: { sha: changedSha, repo: { full_name: 'pixel-brewery/symphony' } } },
    { base: { ref: 'main', sha: mainSha, repo: { full_name: 'untrusted/symphony' } } },
    {
      base: {
        ref: 'other',
        sha: mainSha,
        repo: { full_name: 'pixel-brewery/symphony' },
      },
    },
    {
      base: {
        ref: 'main',
        sha: 'unknown',
        repo: { full_name: 'pixel-brewery/symphony' },
      },
    },
  ])(
    'rejects a pull request outside the Dependabot identity and tested-head gates: %j',
    async (override) => {
      // arrange
      const dependencies = controlled();

      Object.assign(dependencies.records.pullRequest, override);

      // act
      const result = await mergeDependabotPullRequest(context, dependencies);

      // assert
      expect(result).toEqual({ status: 'skipped', reason: 'ineligible-pull-request' });
      expect(writes(dependencies.request)).toEqual([]);
    },
  );

  it.each([
    { status: 'in_progress' },
    { conclusion: 'failure' },
    { conclusion: 'skipped' },
    { conclusion: 'neutral' },
    { conclusion: 'cancelled' },
    { name: 'untrusted job' },
    { run_id: 203 },
    { run_attempt: 1 },
    { id: 2 },
  ])('requires each current-attempt matrix job to succeed exactly once: %j', async (override) => {
    // arrange
    const dependencies = controlled();

    Object.assign(dependencies.records.jobs[0], override);

    // act
    const result = await mergeDependabotPullRequest(context, dependencies);

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'incomplete-verification' });
    expect(writes(dependencies.request)).toEqual([]);
  });

  it.each(['missing', 'duplicate', 'extra'])('rejects %s matrix coverage', async (kind) => {
    // arrange
    const dependencies = controlled();
    const jobs = dependencies.records.jobs;

    if (kind === 'missing') jobs.pop();
    else if (kind === 'duplicate') jobs[2] = { ...jobs[0], id: 6 };
    else jobs.push({ ...jobs[0], id: 6, name: 'extra job' });

    dependencies.records.jobPages[0].total_count = jobs.length;

    // act
    const result = await mergeDependabotPullRequest(context, dependencies);

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'incomplete-verification' });
    expect(writes(dependencies.request)).toEqual([]);
  });

  it.each(
    requiredJobNames.flatMap((name) =>
      ['missing', 'failure', 'skipped'].map((outcome) => ({ name, outcome })),
    ),
  )('requires $name even when every other job succeeds: $outcome', async ({ name, outcome }) => {
    // arrange
    const dependencies = controlled();
    const job = dependencies.records.jobs.find((entry) => entry.name === name);
    if (!job) throw new Error('The required job fixture is missing.');
    if (outcome === 'missing') {
      dependencies.records.jobs.splice(
        dependencies.records.jobs.findIndex((job) => job.name === name),
        1,
      );
    } else {
      job.conclusion = outcome;
    }
    dependencies.records.jobPages[0].total_count = dependencies.records.jobs.length;

    // act
    const result = await mergeDependabotPullRequest(context, dependencies);

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'incomplete-verification' });
    expect(writes(dependencies.request)).toEqual([]);
  });

  it('rejects a successful run with the old Ubuntu-only three-job coverage', async () => {
    // arrange
    const dependencies = controlled();
    dependencies.records.jobPages = [
      {
        total_count: 3,
        jobs: [
          {
            ...dependencies.records.jobs[0],
            name: 'Agents, Format, Lint, Typecheck, Test and Build',
          },
          dependencies.records.jobs[3],
          dependencies.records.jobs[4],
        ],
      },
    ];

    // act
    const result = await mergeDependabotPullRequest(context, dependencies);

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'incomplete-verification' });
    expect(writes(dependencies.request)).toEqual([]);
  });

  it('reads every job page from the triggering attempt before merging', async () => {
    // arrange
    const dependencies = controlled();

    dependencies.records.jobPages = [
      { total_count: 5, jobs: dependencies.records.jobs.slice(0, 1) },
      { total_count: 5, jobs: dependencies.records.jobs.slice(1) },
    ];

    // act
    const result = await mergeDependabotPullRequest(context, dependencies);

    // assert
    expect(result.status).toBe('merged');
    expect(
      dependencies.request.mock.calls.filter(([, endpoint]) => endpoint.includes('/jobs?')),
    ).toEqual([
      ['GET', `${jobsPath}1`, undefined],
      ['GET', `${jobsPath}2`, undefined],
    ]);
  });

  it.each(['count-changed', 'empty-page', 'too-many', 'invalid-shape'])(
    'fails closed when job pagination is incomplete or inconsistent: %s',
    async (kind) => {
      // arrange
      const dependencies = controlled();
      const jobs = dependencies.records.jobs;

      dependencies.records.jobPages = [
        { total_count: 5, jobs: jobs.slice(0, 1) },
        { total_count: kind === 'count-changed' ? 6 : 5, jobs: jobs.slice(1) },
      ];

      if (kind === 'empty-page') dependencies.records.jobPages[1].jobs = [];
      else if (kind === 'too-many') dependencies.records.jobPages[0].total_count = 1_001;
      else if (kind === 'invalid-shape') dependencies.records.jobPages[0].jobs = null;

      // act
      const result = await mergeDependabotPullRequest(context, dependencies);

      // assert
      expect(result).toEqual({ status: 'skipped', reason: 'incomplete-verification' });
      expect(writes(dependencies.request)).toEqual([]);
    },
  );

  it.each([
    { behind_by: 1 },
    { merge_base_commit: { sha: changedSha } },
    { merge_base_commit: null },
  ])('requires current main to be an ancestor of the tested head: %j', async (override) => {
    // arrange
    const dependencies = controlled();

    Object.assign(dependencies.records.comparison, override);

    // act
    const result = await mergeDependabotPullRequest(context, dependencies);

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'branch-not-current' });
    expect(writes(dependencies.request)).toEqual([]);
  });

  it('rejects malformed main metadata without constructing an untrusted compare endpoint', async () => {
    // arrange
    const dependencies = controlled();

    dependencies.records.main.commit.sha = 'untrusted/branch';

    // act
    const result = await mergeDependabotPullRequest(context, dependencies);

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'invalid-main' });
    expect(
      dependencies.request.mock.calls.some(([, endpoint]) => endpoint.includes('/compare/')),
    ).toBe(false);
    expect(writes(dependencies.request)).toEqual([]);
  });

  it.each(['head', 'base', 'author', 'closed'])(
    'rejects a changed pull request before the final write: %s',
    async (kind) => {
      // arrange
      const dependencies = controlled();
      const next = structuredClone(dependencies.records.pullRequest);

      if (kind === 'head') next.head.sha = changedSha;
      else if (kind === 'base') next.base.sha = changedSha;
      else if (kind === 'author') next.user = { login: 'contributor', type: 'User' };
      else next.state = 'closed';

      dependencies.records.nextPullRequest = next;

      // act
      const result = await mergeDependabotPullRequest(context, dependencies);

      // assert
      expect(result).toEqual({ status: 'skipped', reason: 'pull-request-changed' });
      expect(writes(dependencies.request)).toEqual([]);
    },
  );

  it.each([
    { run_attempt: 3 },
    { status: 'in_progress' },
    { conclusion: 'failure' },
    { head_sha: changedSha },
    { pull_requests: [{ number: 8 }] },
  ])('rejects a retried or changed run immediately before merging: %j', async (override) => {
    // arrange
    const dependencies = controlled();

    dependencies.records.nextRun = { ...dependencies.records.run, ...override };

    // act
    const result = await mergeDependabotPullRequest(context, dependencies);

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'workflow-run-changed' });
    expect(writes(dependencies.request)).toEqual([]);
  });

  it('rejects main moving after the ancestry check', async () => {
    // arrange
    const dependencies = controlled();

    dependencies.records.nextMain = { commit: { sha: changedSha } };

    // act
    const result = await mergeDependabotPullRequest(context, dependencies);

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'main-changed' });
    expect(writes(dependencies.request)).toEqual([]);
  });

  it.each([
    ['GET', `${jobsPath}1`],
    ['PUT', `${pullRequestPath}/merge`],
  ])(
    'stops on a rejected API request without leaking its diagnostic or retrying: %s',
    async (method, endpoint) => {
      // arrange
      const dependencies = controlled();

      dependencies.records.failure = { method, endpoint };

      // act
      const result = mergeDependabotPullRequest(context, dependencies);

      // assert
      await expect(result).rejects.toThrow(
        'Dependabot merge stopped after a GitHub API request failed;',
      );
      await expect(result).rejects.not.toThrow('Sensitive upstream output');
      expect(
        dependencies.request.mock.calls.filter(
          ([calledMethod, calledEndpoint]) =>
            calledMethod === method && calledEndpoint === endpoint,
        ),
      ).toHaveLength(1);
      expect(writes(dependencies.request)).toHaveLength(method === 'PUT' ? 1 : 0);
    },
  );

  it('requires an explicit merge confirmation without retrying or exposing the API message', async () => {
    // arrange
    const dependencies = controlled();

    dependencies.records.merge = {
      merged: false,
      message: 'Sensitive merge diagnostic must not reach the caller.',
    };

    // act
    const result = mergeDependabotPullRequest(context, dependencies);

    // assert
    await expect(result).rejects.toThrow('GitHub did not confirm');
    await expect(result).rejects.not.toThrow('Sensitive merge diagnostic');
    expect(writes(dependencies.request)).toHaveLength(1);
  });
});
