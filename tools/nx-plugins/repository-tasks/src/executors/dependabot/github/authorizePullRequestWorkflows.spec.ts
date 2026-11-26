// #region Imports
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { authorizePullRequestWorkflows } from './authorizePullRequestWorkflows.mjs';
import { verificationPolicy } from './verificationPolicy.mjs';
// #endregion

const M = 'a'.repeat(40),
  B = 'b'.repeat(40),
  C = 'c'.repeat(40),
  tree = 'd'.repeat(40);
const prefix = 'repos/pixel-brewery/symphony';
const branch = 'dependabot/npm_and_yarn/frameworks';
const context = {
  eventName: 'schedule',
  repository: 'pixel-brewery/symphony',
  repositoryId: 1440122208,
  defaultBranch: 'main',
  number: 7,
};
const service = { id: 41898282, login: 'github-actions[bot]', type: 'Bot' };
const bot = { id: 49699333, login: 'dependabot[bot]', type: 'Bot' };
const ci = readFileSync(
  new URL('../../../../../../../.github/workflows/ci.yml', import.meta.url),
  'utf8',
);

function controlled() {
  const repo = {
    id: 1440122208,
    name: 'symphony',
    full_name: 'pixel-brewery/symphony',
    default_branch: 'main',
    private: false,
    visibility: 'public',
    fork: false,
  };
  const pull = {
    number: 7,
    state: 'open',
    draft: false,
    merged: false,
    merged_at: null,
    mergeable: true,
    merge_commit_sha: C,
    user: { ...bot },
    head: { sha: B, ref: branch, repo },
    base: { sha: M, ref: 'main', repo },
  };
  const run = {
    id: 20,
    run_attempt: 1,
    event: 'pull_request',
    workflow_id: 10,
    name: 'Repository Quality',
    path: '.github/workflows/ci.yml',
    status: 'completed',
    conclusion: 'action_required',
    head_sha: B,
    head_branch: branch,
    repository: repo,
    head_repository: repo,
    actor: { ...service },
    triggering_actor: { ...service },
    pull_requests: [
      { number: 7, head: structuredClone(pull.head), base: structuredClone(pull.base) },
    ],
  };
  const state = {
    repo,
    pull,
    run,
    triggerRun: { ...structuredClone(run), id: 19 },
    openPages: undefined as Readonly<Record<number, unknown>> | undefined,
    workflow: {
      id: 10,
      name: 'Repository Quality',
      path: '.github/workflows/ci.yml',
      state: 'active',
    },
    releaseWorkflow: {
      id: 11,
      name: 'Continuous Desktop Release',
      path: '.github/workflows/release.yml',
      state: 'active',
    },
    main: { name: 'main', commit: { sha: M } },
    branch: { object: { type: 'commit', sha: B } },
    mergeRef: { object: { type: 'commit', sha: C } },
    candidate: { sha: B, tree: { sha: tree } },
    merge: { sha: C, tree: { sha: tree }, parents: [{ sha: M }, { sha: B }] },
    comparison: { behind_by: 0, merge_base_commit: { sha: M } },
    baseline: ci,
    proposed: ci,
    associations: [pull],
    runs: [run],
    rules: [
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
    ],
  };
  const calls = new Map();
  const request = vi.fn((method, endpoint) => {
    const count = (calls.get(endpoint) ?? 0) + 1;
    calls.set(endpoint, count);
    if (method === 'POST' && endpoint === `${prefix}/actions/runs/20/approve`) {
      if (state.denyApproval) throw new Error('Synthetic private HTTP 403 response.');
      return undefined;
    }
    if (method !== 'GET') throw new Error('Unexpected write.');
    if (endpoint === 'repositories/1440122208') return structuredClone(state.repo);
    if (endpoint.startsWith(`${prefix}/pulls?state=open&base=main&per_page=100&page=`)) {
      const page = Number(endpoint.split('=').at(-1));
      if (state.openPages && Object.hasOwn(state.openPages, page))
        return structuredClone(state.openPages[page]);
      if (page === 1)
        return [state.pull, { number: 8, user: { id: 1, login: 'maintainer', type: 'User' } }];
      throw new Error('Unexpected inventory page.');
    }
    if (endpoint === `${prefix}/actions/workflows/ci.yml`)
      return structuredClone(count > 1 && state.nextWorkflow ? state.nextWorkflow : state.workflow);
    if (endpoint === `${prefix}/actions/workflows/release.yml`)
      return structuredClone(state.releaseWorkflow);
    if (endpoint === `${prefix}/pulls/7`)
      return structuredClone(count > 1 && state.nextPull ? state.nextPull : state.pull);
    if (endpoint === `${prefix}/branches/main`)
      return structuredClone(count > 1 && state.nextMain ? state.nextMain : state.main);
    if (endpoint === `${prefix}/git/ref/heads/${branch}`) return structuredClone(state.branch);
    if (endpoint === `${prefix}/git/ref/pull/7/merge`) return structuredClone(state.mergeRef);
    if (endpoint === `${prefix}/git/commits/${B}`) return structuredClone(state.candidate);
    if (endpoint === `${prefix}/git/commits/${C}`) return structuredClone(state.merge);
    if (endpoint === `${prefix}/compare/${M}...${B}`) return structuredClone(state.comparison);
    if (endpoint === `${prefix}/commits/${B}/pulls?per_page=100`)
      return structuredClone(state.associations);
    if (endpoint === `${prefix}/actions/workflows/ci.yml/runs?head_sha=${B}&per_page=100`)
      return {
        total_count: state.incomplete ? state.runs.length + 1 : state.runs.length,
        workflow_runs: structuredClone(state.runs),
      };
    if (endpoint === `${prefix}/actions/runs/20`)
      return structuredClone(count > 1 && state.nextRun ? state.nextRun : state.run);
    if (endpoint === `${prefix}/actions/runs/19`) return structuredClone(state.triggerRun);
    if (endpoint.startsWith(`${prefix}/actions/runs/`))
      return structuredClone(
        state.runs.find((run) => String(run.id) === endpoint.split('/').at(-1)),
      );
    if (endpoint === `${prefix}/rules/branches/main`) return structuredClone(state.rules);
    if (endpoint.startsWith(`${prefix}/contents/.github/workflows/ci.yml?ref=`)) {
      const text = endpoint.endsWith(M) ? state.baseline : state.proposed;
      const bytes = Buffer.from(text);
      return {
        type: 'file',
        encoding: 'base64',
        content: bytes.toString('base64'),
        sha: state.badBlob
          ? M
          : createHash('sha1').update(`blob ${bytes.length}\0`).update(bytes).digest('hex'),
      };
    }
    throw new Error('Unexpected fixed metadata route.');
  });
  return { state, request };
}

const writes = (request) => request.mock.calls.filter(([method]) => method !== 'GET');

describe('Isolated native CI authorization inventory', () => {
  it('authorizes scheduled own bot candidates through the actual full source proof', async () => {
    // arrange
    const fixture = controlled();
    // act
    const result = await authorizePullRequestWorkflows(context, fixture);
    // assert
    expect(result).toEqual([
      { number: 7, status: 'verification-approved', head: B, runId: 20, runAttempt: 1 },
    ]);
    expect(writes(fixture.request)).toEqual([['POST', `${prefix}/actions/runs/20/approve`]]);
  });
  it('rechecks the fresh open inventory after an owned completed CI trigger', async () => {
    // arrange
    const fixture = controlled();
    // act
    const result = await authorizePullRequestWorkflows(
      { ...context, eventName: 'workflow_run', runId: 19, runAttempt: 1 },
      fixture,
    );
    // assert
    expect(result[0].status).toBe('verification-approved');
    expect(writes(fixture.request)).toHaveLength(1);
    expect(fixture.request.mock.calls).toContainEqual([
      'GET',
      `${prefix}/pulls?state=open&base=main&per_page=100&page=1`,
    ]);
  });
  it.each([
    { kind: 'CI', workflowId: 10, name: 'Repository Quality', path: '.github/workflows/ci.yml' },
    {
      kind: 'release',
      workflowId: 11,
      name: 'Continuous Desktop Release',
      path: '.github/workflows/release.yml',
    },
  ])('recovers the current head and attempt after an older $kind completion', async (trigger) => {
    // arrange
    const fixture = controlled();
    Object.assign(fixture.state.triggerRun, {
      workflow_id: trigger.workflowId,
      name: trigger.name,
      path: trigger.path,
      event: 'push',
      conclusion: 'success',
      head_sha: 'e'.repeat(40),
      head_branch: 'main',
      run_attempt: 2,
      pull_requests: [],
    });
    fixture.state.run.run_attempt = 2;

    // act
    const result = await authorizePullRequestWorkflows(
      { ...context, eventName: 'workflow_run', runId: 19, runAttempt: 1 },
      fixture,
    );

    // assert
    expect(result).toEqual([
      { number: 7, status: 'verification-approved', head: B, runId: 20, runAttempt: 2 },
    ]);
    expect(writes(fixture.request)).toEqual([['POST', `${prefix}/actions/runs/20/approve`]]);
  });
  it.each([
    { workflow_id: 999 },
    { name: 'Unrelated Workflow' },
    { path: '.github/workflows/unrelated.yml' },
    { repository: { id: 1 } },
    { head_repository: { id: 1 } },
    { status: 'in_progress' },
  ])(
    'rejects an unrelated or incomplete completion trigger before any approval: %j',
    async (change) => {
      // arrange
      const fixture = controlled();
      Object.assign(fixture.state.triggerRun, change);

      // act
      const result = await authorizePullRequestWorkflows(
        { ...context, eventName: 'workflow_run', runId: 19, runAttempt: 1 },
        fixture,
      );

      // assert
      expect(result).toEqual([]);
      expect(writes(fixture.request)).toEqual([]);
    },
  );
  it.each([
    { conclusion: 'success' },
    { event: 'workflow_dispatch' },
    { head_repository: { id: 1 } },
  ])('withholds approval for an ineligible current native run: %j', async (change) => {
    // arrange
    const fixture = controlled();
    Object.assign(fixture.state.run, change);
    // act
    const result = await authorizePullRequestWorkflows(
      { ...context, eventName: 'workflow_run', runId: 19, runAttempt: 1 },
      fixture,
    );
    // assert
    expect(result[0].status).toBe('waiting');
    expect(writes(fixture.request)).toEqual([]);
  });
  it('finishes the bounded open inventory before authorizing its own bot candidate', async () => {
    // arrange
    const fixture = controlled();
    fixture.state.openPages = {
      1: [
        fixture.state.pull,
        ...Array.from({ length: 99 }, (_, index) => ({
          number: index + 8,
          user: { id: 1, login: 'maintainer', type: 'User' },
        })),
      ],
      2: [],
    };

    // act
    const result = await authorizePullRequestWorkflows(context, fixture);

    // assert
    expect(result[0].status).toBe('verification-approved');
    const lastPage = fixture.request.mock.calls.findIndex(
      ([, endpoint]) => endpoint === `${prefix}/pulls?state=open&base=main&per_page=100&page=2`,
    );
    const approval = fixture.request.mock.calls.findIndex(([method]) => method === 'POST');
    expect(lastPage).toBeGreaterThanOrEqual(0);
    expect(lastPage).toBeLessThan(approval);
    expect(writes(fixture.request)).toHaveLength(1);
  });
  it.each([null, {}, Array.from({ length: 101 }, () => ({ number: 7, user: bot }))])(
    'rejects malformed or oversized inventory pages before approval: %j',
    async (page) => {
      // arrange
      const fixture = controlled();
      fixture.state.openPages = { 1: page };

      // act
      const result = authorizePullRequestWorkflows(context, fixture);

      // assert
      await expect(result).rejects.toThrow('authorization inventory');
      expect(writes(fixture.request)).toEqual([]);
    },
  );
  it('does not authorize an earlier candidate when a later page is malformed', async () => {
    // arrange
    const fixture = controlled();
    fixture.state.openPages = {
      1: Array.from({ length: 100 }, () => fixture.state.pull),
      2: null,
    };

    // act
    const result = authorizePullRequestWorkflows(context, fixture);

    // assert
    await expect(result).rejects.toThrow('authorization inventory');
    expect(writes(fixture.request)).toEqual([]);
  });
  it('fails closed at the fifth full page without approving a partial inventory', async () => {
    // arrange
    const fixture = controlled();
    fixture.state.openPages = Object.fromEntries(
      Array.from({ length: 5 }, (_, index) => [
        index + 1,
        Array.from({ length: 100 }, () => fixture.state.pull),
      ]),
    );

    // act
    const result = authorizePullRequestWorkflows(context, fixture);

    // assert
    await expect(result).rejects.toThrow('authorization inventory exceeds its bound');
    expect(writes(fixture.request)).toEqual([]);
    expect(
      fixture.request.mock.calls.filter(([, endpoint]) => endpoint.includes('/pulls?state=open')),
    ).toHaveLength(5);
  });
  it('sanitizes one failed approval without retrying its native attempt', async () => {
    // arrange
    const fixture = controlled();
    fixture.state.denyApproval = true;
    // act
    const result = await authorizePullRequestWorkflows(context, fixture);
    // assert
    expect(result).toEqual([{ number: 7, status: 'blocked', reason: 'approval-request-failed' }]);
    expect(writes(fixture.request)).toHaveLength(1);
  });
});
