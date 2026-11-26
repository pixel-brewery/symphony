// #region Imports

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { verificationPolicy } from './github/verificationPolicy.mjs';
import { mergeDependabotPullRequest } from './mergeDependabotPullRequest.mjs';

// #endregion

const repositoryId = 1440122208;
const repositoryPath = 'repos/pixel-brewery/symphony';
const mainSha = 'a'.repeat(40);
const headSha = 'b'.repeat(40);
const mergeSha = 'c'.repeat(40);
const changedSha = 'd'.repeat(40);
const testMergeSha = 'e'.repeat(40);
const treeSha = 'f'.repeat(40);
const branch = 'dependabot/npm_and_yarn/frameworks';
const ci = readFileSync(
  new URL('../../../../../../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);
const ciBlob = {
  type: 'file',
  encoding: 'base64',
  content: Buffer.from(ci).toString('base64'),
  sha: createHash('sha1')
    .update(`blob ${Buffer.byteLength(ci)}\0`)
    .update(ci)
    .digest('hex'),
};
const context = {
  eventName: 'workflow_run',
  repository: 'pixel-brewery/symphony',
  repositoryId: repositoryId,
  defaultBranch: 'main',
  runId: 202,
  runAttempt: 2,
};
const jobsPath = `${repositoryPath}/actions/runs/202/attempts/2/jobs?per_page=100&page=`;
const pullRequestPath = `${repositoryPath}/pulls/7`;
const runPath = `${repositoryPath}/actions/runs/202`;
const mainPath = `${repositoryPath}/branches/main`;

function controlled() {
  const repository = { id: repositoryId, full_name: 'pixel-brewery/symphony' };
  const jobs = verificationPolicy.requiredJobs.map((name, index) => ({
    id: index + 1,
    run_id: 202,
    run_attempt: 2,
    head_sha: headSha,
    name,
    status: 'completed',
    conclusion: 'success',
  }));
  const records = {
    workflow: {
      id: 101,
      name: 'Repository Quality',
      path: '.github/workflows/ci.yml',
      state: 'active',
    },
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
      head_branch: branch,
      actor: { id: 49699333, login: 'dependabot[bot]', type: 'Bot' },
      triggering_actor: { id: 49699333, login: 'dependabot[bot]', type: 'Bot' },
      pull_requests: [
        {
          number: 7,
          head: { ref: branch, sha: headSha, repo: repository },
          base: { ref: 'main', sha: mainSha, repo: repository },
        },
      ],
    },
    pullRequest: {
      number: 7,
      state: 'open',
      draft: false,
      merged: false,
      user: { id: 49699333, login: 'dependabot[bot]', type: 'Bot' },
      mergeable: true,
      merge_commit_sha: testMergeSha,
      head: { sha: headSha, ref: branch, repo: repository },
      base: { ref: 'main', sha: mainSha, repo: repository },
    },
    main: { name: 'main', commit: { sha: mainSha } },
    comparison: { behind_by: 0, merge_base_commit: { sha: mainSha } },
    jobs,
    jobPages: [{ total_count: jobs.length, jobs }],
    merge: { merged: true, sha: mergeSha },
  };
  const reads = new Map();
  let merged = false;
  const request = vi.fn((method, endpoint) => {
    if (records.failure?.method === method && records.failure?.endpoint === endpoint)
      throw new Error('Sensitive upstream output must not reach the caller.');

    if (method === 'PUT' && endpoint === `${pullRequestPath}/merge`) {
      merged = records.merge.merged === true;
      return structuredClone(records.merge);
    }

    if (method !== 'GET') throw new Error('Unexpected test request.');

    const count = (reads.get(endpoint) ?? 0) + 1;

    reads.set(endpoint, count);

    if (endpoint === `repositories/${repositoryId}`)
      return {
        ...repository,
        name: 'symphony',
        default_branch: 'main',
        fork: false,
        visibility: 'public',
        private: false,
      };

    if (endpoint === `${repositoryPath}/actions/workflows/ci.yml`)
      return structuredClone(records.workflow);

    if (endpoint === runPath)
      return structuredClone(count > 1 ? (records.nextRun ?? records.run) : records.run);

    if (endpoint === pullRequestPath)
      return merged
        ? {
            ...structuredClone(records.pullRequest),
            state: 'closed',
            merged: true,
            merge_commit_sha: records.merge.sha,
          }
        : structuredClone(
            count > 1 ? (records.nextPullRequest ?? records.pullRequest) : records.pullRequest,
          );

    if (
      endpoint ===
      `${repositoryPath}/actions/workflows/ci.yml/runs?head_sha=${headSha}&per_page=100`
    )
      return { total_count: 1, workflow_runs: [structuredClone(records.run)] };
    if (endpoint === `${repositoryPath}/git/ref/heads/${branch}`)
      return { object: { type: 'commit', sha: headSha } };
    if (endpoint === `${repositoryPath}/git/ref/pull/7/merge`)
      return { object: { type: 'commit', sha: testMergeSha } };
    if (endpoint === `${repositoryPath}/git/commits/${headSha}`)
      return { sha: headSha, tree: { sha: treeSha } };
    if (endpoint === `${repositoryPath}/git/commits/${testMergeSha}`)
      return {
        sha: testMergeSha,
        tree: { sha: treeSha },
        parents: [{ sha: mainSha }, { sha: headSha }],
      };
    if (
      endpoint === `${repositoryPath}/contents/.github/workflows/ci.yml?ref=${mainSha}` ||
      endpoint === `${repositoryPath}/contents/.github/workflows/ci.yml?ref=${headSha}`
    )
      return ciBlob;
    if (endpoint === `${repositoryPath}/commits/${headSha}/pulls?per_page=100`)
      return [{ ...structuredClone(records.pullRequest), merged: undefined, merged_at: null }];
    if (endpoint === `${repositoryPath}/rules/branches/main`)
      return [
        { type: 'pull_request' },
        {
          type: 'required_status_checks',
          parameters: {
            strict_required_status_checks_policy: true,
            required_status_checks: verificationPolicy.requiredChecks.map((context) => ({
              context,
              integration_id: 15368,
            })),
          },
        },
      ];

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
  it('accepts a successful ordinary maintainer CI actor through all native source and job gates', async () => {
    // arrange
    const fixture = controlled();
    fixture.records.run.actor = { id: 42, login: 'maintainer', type: 'User' };
    fixture.records.run.triggering_actor = { id: 42, login: 'maintainer', type: 'User' };

    // act
    const result = await mergeDependabotPullRequest(context, fixture);

    // assert
    expect(result.status).toBe('merged');
    expect(writes(fixture.request)).toEqual([
      ['PUT', `${pullRequestPath}/merge`, { sha: headSha, merge_method: 'squash' }],
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
    expect(dependencies.request.mock.calls.at(-1)).toEqual(['GET', pullRequestPath, undefined]);
    expect(
      dependencies.request.mock.calls.filter(([, endpoint]) => endpoint === runPath).length,
    ).toBeGreaterThanOrEqual(2);
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
    { repository: { full_name: 'untrusted/archipel' } },
    { head_repository: { full_name: 'untrusted/archipel' } },
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
    { head: { sha: headSha, repo: { full_name: 'untrusted/archipel' } } },
    { head: { sha: changedSha, repo: { full_name: 'pixel-brewery/symphony' } } },
    { base: { ref: 'main', sha: mainSha, repo: { full_name: 'untrusted/archipel' } } },
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

  it.each(['failure', 'cancelled', 'skipped'])(
    'rejects a %s aggregate gate even when the workflow reports success',
    async (conclusion) => {
      // arrange
      const dependencies = controlled();

      dependencies.records.jobs[dependencies.records.jobs.length - 1].conclusion = conclusion;

      // act
      const result = await mergeDependabotPullRequest(context, dependencies);

      // assert
      expect(result).toEqual({ status: 'skipped', reason: 'incomplete-verification' });
      expect(writes(dependencies.request)).toEqual([]);
    },
  );

  it.each(['missing', 'duplicate', 'extra'])('rejects %s matrix coverage', async (kind) => {
    // arrange
    const dependencies = controlled();
    const jobs = dependencies.records.jobs;

    if (kind === 'missing') jobs.pop();
    else if (kind === 'duplicate') jobs[2] = { ...jobs[0], id: 5 };
    else jobs.push({ ...jobs[0], id: 5, name: 'extra job' });

    dependencies.records.jobPages[0].total_count = jobs.length;

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
      { total_count: recordsLength(dependencies), jobs: dependencies.records.jobs.slice(0, 1) },
      { total_count: recordsLength(dependencies), jobs: dependencies.records.jobs.slice(1) },
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
        { total_count: recordsLength(dependencies), jobs: jobs.slice(0, 1) },
        {
          total_count:
            kind === 'count-changed'
              ? recordsLength(dependencies) + 1
              : recordsLength(dependencies),
          jobs: jobs.slice(1),
        },
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
      expect(result).toEqual({ status: 'skipped', reason: 'pull-request-or-main-changed' });
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
    expect(result).toEqual({ status: 'skipped', reason: 'unproven-readonly-source' });
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

describe('Dependabot refreshed-head verification', () => {
  it('rejects diagnostic CI even for the uniquely associated current Dependabot head', async () => {
    // arrange
    const { records, request } = controlled();
    records.run.event = 'workflow_dispatch';
    records.run.pull_requests = [];
    Object.assign(records.run, { head_branch: 'dependabot/npm_and_yarn/frameworks' });
    Object.assign(records.pullRequest.head, { ref: 'dependabot/npm_and_yarn/frameworks' });
    const original = request.getMockImplementation();
    request.mockImplementation((method, endpoint) =>
      endpoint === `${repositoryPath}/commits/${headSha}/pulls?per_page=100`
        ? [{ ...structuredClone(records.pullRequest), merged: undefined, merged_at: null }]
        : original(method, endpoint),
    );

    // act
    const result = await mergeDependabotPullRequest(context, { request });

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'ineligible-workflow-run' });
    expect(writes(request)).toEqual([]);
  });

  it('rejects ambiguous dispatched-head associations without a merge', async () => {
    // arrange
    const { records, request } = controlled();
    records.run.event = 'workflow_dispatch';
    records.run.pull_requests = [];
    Object.assign(records.run, { head_branch: 'dependabot/npm_and_yarn/frameworks' });
    Object.assign(records.pullRequest.head, { ref: 'dependabot/npm_and_yarn/frameworks' });
    const original = request.getMockImplementation();
    request.mockImplementation((method, endpoint) =>
      endpoint === `${repositoryPath}/commits/${headSha}/pulls?per_page=100`
        ? [
            { ...structuredClone(records.pullRequest), merged: undefined, merged_at: null },
            {
              ...structuredClone(records.pullRequest),
              number: 8,
              merged: undefined,
              merged_at: null,
            },
          ]
        : original(method, endpoint),
    );

    // act
    const result = await mergeDependabotPullRequest(context, { request });

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'ineligible-workflow-run' });
    expect(writes(request)).toEqual([]);
  });

  it('rejects a manually verified non-Dependabot branch without a merge', async () => {
    // arrange
    const { records, request } = controlled();
    records.run.event = 'workflow_dispatch';
    records.run.pull_requests = [];
    Object.assign(records.run, { head_branch: 'feature/manual' });

    // act
    const result = await mergeDependabotPullRequest(context, { request });

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'ineligible-workflow-run' });
    expect(writes(request)).toEqual([]);
  });
});

function recordsLength(dependencies) {
  return dependencies.records.jobs.length;
}
