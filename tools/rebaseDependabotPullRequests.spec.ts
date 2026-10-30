// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { rebaseDependabotPullRequests } from './rebaseDependabotPullRequests.mjs';

// #endregion

const repository = 'pixel-brewery/symphony';
const root = `repos/${repository}`;
const mainSha = 'a'.repeat(40);
const headSha = 'b'.repeat(40);
const marker = `<!-- symphony-dependabot-rebase:${mainSha} -->`;
const context = {
  repository,
  repositoryId: 1440122208,
  defaultBranch: 'main',
  eventName: 'push',
  ref: 'refs/heads/main',
};

function pullRequest(number = 1, mutate = () => undefined) {
  const result = {
    number,
    state: 'open',
    draft: false,
    merged: false,
    mergeable_state: 'clean',
    user: { login: 'dependabot[bot]', type: 'Bot' },
    head: { sha: headSha, repo: { id: 1440122208, full_name: repository } },
    base: { ref: 'main', sha: mainSha, repo: { id: 1440122208, full_name: repository } },
  };

  mutate(result);

  return result;
}

function controlled(options = {}) {
  const repositoryName = options.repository ?? repository;
  const defaultBranch = options.defaultBranch ?? 'main';
  const root = `repos/${repositoryName}`;
  let mainReads = 0;
  const pullReads = new Map();
  const listed = options.listed ?? [
    pullRequest(1, (value) => {
      value.head.repo.full_name = repositoryName;
      value.base.repo.full_name = repositoryName;
      value.base.ref = defaultBranch;
    }),
  ];
  const request = vi.fn(async (method, endpoint, body) => {
    if (options.fail?.(method, endpoint)) throw new Error('synthetic-private-token');

    if (method === 'GET' && endpoint === 'repositories/1440122208')
      return {
        id: 1440122208,
        name: 'symphony',
        fork: false,
        full_name: repositoryName,
        default_branch: defaultBranch,
      };

    if (method === 'GET' && endpoint === `${root}/branches/${encodeURIComponent(defaultBranch)}`) {
      mainReads++;

      return options.main?.(mainReads) ?? { name: defaultBranch, commit: { sha: mainSha } };
    }

    if (method === 'GET' && endpoint.startsWith(`${root}/pulls?`)) {
      const page = Number(new URL(endpoint, 'https://api.github.com/').searchParams.get('page'));

      return options.pullPages?.(page) ?? listed;
    }

    if (method === 'GET' && endpoint.startsWith(`${root}/compare/`))
      return options.comparison ?? { behind_by: 2 };

    if (method === 'GET' && endpoint.startsWith(`${root}/issues/`)) {
      const page = Number(new URL(endpoint, 'https://api.github.com/').searchParams.get('page'));

      return options.commentPages?.(page) ?? [];
    }

    if (method === 'GET' && endpoint.startsWith(`${root}/pulls/`)) {
      const number = Number(endpoint.split('/').at(-1));
      const count = (pullReads.get(number) ?? 0) + 1;

      pullReads.set(number, count);

      return options.detail?.(number, count) ?? listed.find((item) => item.number === number);
    }

    if (method === 'POST') return options.posted ?? { id: 900, body: body.body };

    throw new Error('Unexpected controlled API request.');
  });

  return { request };
}

function writes(dependencies) {
  return dependencies.request.mock.calls.filter(([method]) => method !== 'GET');
}

describe('Dependabot rebase requests', () => {
  it.each([
    { repository: 'contributor-owner/symphony', defaultBranch: 'main' },
    { repository: 'pixel-brewery/symphony', defaultBranch: 'trunk' },
  ])('refreshes only the API-bound repository and default branch: %j', async (identity) => {
    // arrange
    const dependencies = controlled(identity);

    // act
    const result = await rebaseDependabotPullRequests(
      { ...context, ...identity, ref: `refs/heads/${identity.defaultBranch}` },
      dependencies,
    );

    // assert
    expect(result.rebased).toEqual([1]);
    expect(writes(dependencies)).toEqual([
      [
        'POST',
        `repos/${identity.repository}/issues/1/comments`,
        { body: `@dependabot rebase\n\n${marker}` },
      ],
    ]);
  });

  it.each([{ eventName: 'pull_request' }, { ref: 'refs/heads/untrusted' }])(
    'does not refresh from a pull-request event or nondefault branch: %j',
    async (override) => {
      // arrange
      const dependencies = controlled();

      // act
      const result = await rebaseDependabotPullRequests({ ...context, ...override }, dependencies);

      // assert
      expect(result).toEqual({ status: 'skipped', reason: 'unsupported-context' });
      expect(writes(dependencies)).toEqual([]);
    },
  );

  it.each([undefined, {}, { repository: 'someone/symphony' }])(
    'ignores a missing or foreign repository before accessing GitHub: %s',
    async (input) => {
      // arrange
      const dependencies = controlled();

      // act
      const result = await rebaseDependabotPullRequests(input, dependencies);

      // assert
      expect(result).toEqual({ status: 'skipped', reason: 'unsupported-repository' });
      expect(dependencies.request).not.toHaveBeenCalled();
    },
  );

  it.each([
    { name: 'other', commit: { sha: mainSha } },
    { name: 'main', commit: { sha: 'unknown' } },
    { name: 'main' },
  ])('does not process pull requests without canonical main metadata: %j', async (main) => {
    // arrange
    const dependencies = controlled({ main: () => main });

    // act
    const result = await rebaseDependabotPullRequests(context, dependencies);

    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'invalid-main' });
    expect(dependencies.request).toHaveBeenCalledTimes(2);
    expect(writes(dependencies)).toEqual([]);
  });

  it('requests a rebase for a behind Dependabot head after rereading main and PR ownership', async () => {
    // arrange
    const dependencies = controlled();

    // act
    const result = await rebaseDependabotPullRequests(context, dependencies);

    // assert
    expect(result).toEqual({ status: 'completed', mainSha, rebased: [1], skipped: [] });
    expect(dependencies.request.mock.calls).toEqual([
      ['GET', 'repositories/1440122208', undefined],
      ['GET', `${root}/branches/main`, undefined],
      ['GET', `${root}/pulls?state=open&base=main&per_page=100&page=1`, undefined],
      ['GET', `${root}/pulls/1`, undefined],
      ['GET', `${root}/compare/${mainSha}...${headSha}`, undefined],
      ['GET', `${root}/issues/1/comments?per_page=100&page=1`, undefined],
      ['GET', `${root}/branches/main`, undefined],
      ['GET', `${root}/pulls/1`, undefined],
      ['POST', `${root}/issues/1/comments`, { body: `@dependabot rebase\n\n${marker}` }],
    ]);
  });

  it('requests a conflicting head even when the comparison reports no missing main commits', async () => {
    // arrange
    const listed = [pullRequest(1, (value) => (value.mergeable_state = 'dirty'))];
    const dependencies = controlled({ listed, comparison: { behind_by: 0 } });

    // act
    const result = await rebaseDependabotPullRequests(context, dependencies);

    // assert
    expect(result.rebased).toEqual([1]);
    expect(writes(dependencies)).toHaveLength(1);
  });

  it.each(['clean', 'unknown', undefined])(
    'leaves current heads alone when mergeability is %s',
    async (mergeableState) => {
      // arrange
      const listed = [pullRequest(1, (value) => (value.mergeable_state = mergeableState))];
      const dependencies = controlled({ listed, comparison: { behind_by: 0 } });

      // act
      const result = await rebaseDependabotPullRequests(context, dependencies);

      // assert
      expect(result.skipped).toEqual([{ number: 1, reason: 'up-to-date' }]);
      expect(writes(dependencies)).toEqual([]);
      expect(dependencies.request).toHaveBeenCalledTimes(5);
    },
  );

  it.each([
    ['human author', (value) => (value.user.login = 'maintainer')],
    ['non-bot account', (value) => (value.user.type = 'User')],
    ['draft', (value) => (value.draft = true)],
    ['closed', (value) => (value.state = 'closed')],
    ['merged', (value) => (value.merged = true)],
    ['foreign head', (value) => (value.head.repo.full_name = 'outsider/symphony')],
    ['foreign base', (value) => (value.base.repo.full_name = 'outsider/symphony')],
    ['other base branch', (value) => (value.base.ref = 'release')],
    ['missing head identity', (value) => (value.head.sha = undefined)],
    ['missing base identity', (value) => (value.base.sha = undefined)],
  ])('ignores a listed %s without reading its comments or writing', async (_name, mutate) => {
    // arrange
    const dependencies = controlled({ listed: [pullRequest(1, mutate)] });

    // act
    const result = await rebaseDependabotPullRequests(context, dependencies);

    // assert
    expect(result.skipped).toEqual([{ number: 1, reason: 'ineligible-pull-request' }]);
    expect(dependencies.request).toHaveBeenCalledTimes(3);
    expect(writes(dependencies)).toEqual([]);
  });

  it.each([{ behind_by: -1 }, { behind_by: '2' }, {}, { behind_by: 0.5 }])(
    'does not write when comparison metadata is unknown: %j',
    async (comparison) => {
      // arrange
      const dependencies = controlled({ comparison });

      // act
      const result = await rebaseDependabotPullRequests(context, dependencies);

      // assert
      expect(result.skipped).toEqual([{ number: 1, reason: 'unknown-comparison' }]);
      expect(writes(dependencies)).toEqual([]);
    },
  );

  it('skips a head already changed between enumeration and inspection', async () => {
    // arrange
    const dependencies = controlled({
      detail: () => pullRequest(1, (value) => (value.head.sha = 'c'.repeat(40))),
    });

    // act
    const result = await rebaseDependabotPullRequests(context, dependencies);

    // assert
    expect(result.skipped).toEqual([{ number: 1, reason: 'pull-request-changed' }]);
    expect(writes(dependencies)).toEqual([]);
    expect(dependencies.request).toHaveBeenCalledTimes(4);
  });

  it.each([
    ['new head', (value) => (value.head.sha = 'c'.repeat(40))],
    ['new base', (value) => (value.base.sha = 'c'.repeat(40))],
    ['closed', (value) => (value.state = 'closed')],
    ['draft', (value) => (value.draft = true)],
    ['foreign ownership', (value) => (value.head.repo.full_name = 'outsider/symphony')],
  ])('skips a PR whose final reread shows %s', async (_name, mutate) => {
    // arrange
    const dependencies = controlled({
      detail: (number, count) => pullRequest(number, count === 2 ? mutate : undefined),
    });

    // act
    const result = await rebaseDependabotPullRequests(context, dependencies);

    // assert
    expect(result.skipped).toEqual([{ number: 1, reason: 'pull-request-changed' }]);
    expect(writes(dependencies)).toEqual([]);
  });

  it('skips a conflict that resolves before the final PR reread', async () => {
    // arrange
    const listed = [pullRequest(1, (value) => (value.mergeable_state = 'dirty'))];
    const dependencies = controlled({
      listed,
      comparison: { behind_by: 0 },
      detail: (number, count) =>
        pullRequest(number, (value) => (value.mergeable_state = count === 1 ? 'dirty' : 'clean')),
    });

    // act
    const result = await rebaseDependabotPullRequests(context, dependencies);

    // assert
    expect(result.skipped).toEqual([{ number: 1, reason: 'up-to-date' }]);
    expect(writes(dependencies)).toEqual([]);
  });

  it('stops before a write when main advances so the next push can inspect the new base', async () => {
    // arrange
    const dependencies = controlled({
      main: (count) => ({
        name: 'main',
        commit: { sha: count === 1 ? mainSha : 'c'.repeat(40) },
      }),
      listed: [pullRequest(1), pullRequest(2)],
    });

    // act
    const result = await rebaseDependabotPullRequests(context, dependencies);

    // assert
    expect(result).toEqual({
      status: 'stopped',
      reason: 'main-changed',
      mainSha,
      rebased: [],
      skipped: [],
    });
    expect(writes(dependencies)).toEqual([]);
    expect(
      dependencies.request.mock.calls.some(([, endpoint]) => endpoint === `${root}/pulls/2`),
    ).toBe(false);
  });

  it('deduplicates an existing GitHub Actions marker on a later comment page', async () => {
    // arrange
    const dependencies = controlled({
      commentPages: (page) =>
        page === 1
          ? Array.from({ length: 100 }, () => ({ body: 'Earlier comment.' }))
          : [
              {
                body: `@dependabot rebase\n\n${marker}`,
                user: { login: 'github-actions[bot]', type: 'Bot' },
              },
            ],
    });

    // act
    const result = await rebaseDependabotPullRequests(context, dependencies);

    // assert
    expect(result.skipped).toEqual([{ number: 1, reason: 'already-requested' }]);
    expect(dependencies.request).toHaveBeenCalledWith(
      'GET',
      `${root}/issues/1/comments?per_page=100&page=2`,
      undefined,
    );
    expect(writes(dependencies)).toEqual([]);
  });

  it.each([
    { body: marker, user: { login: 'maintainer', type: 'User' } },
    { body: marker, user: { login: 'github-actions[bot]', type: 'User' } },
    {
      body: '<!-- symphony-dependabot-rebase:older-main -->',
      user: { login: 'github-actions[bot]', type: 'Bot' },
    },
  ])('does not let a foreign or obsolete marker suppress a rebase: %j', async (comment) => {
    // arrange
    const dependencies = controlled({ commentPages: () => [comment] });

    // act
    const result = await rebaseDependabotPullRequests(context, dependencies);

    // assert
    expect(result.rebased).toEqual([1]);
    expect(writes(dependencies)).toHaveLength(1);
  });

  it('processes a later PR page once even when the API repeats that PR', async () => {
    // arrange
    const outsider = pullRequest(2, (value) => (value.user.login = 'maintainer'));
    const dependencies = controlled({
      listed: [pullRequest(101)],
      pullPages: (page) =>
        page === 1 ? Array(100).fill(outsider) : [pullRequest(101), pullRequest(101)],
    });

    // act
    const result = await rebaseDependabotPullRequests(context, dependencies);

    // assert
    expect(result.rebased).toEqual([101]);
    expect(dependencies.request).toHaveBeenCalledWith(
      'GET',
      `${root}/pulls?state=open&base=main&per_page=100&page=2`,
      undefined,
    );
    expect(writes(dependencies)).toHaveLength(1);
  });

  it.each(['pulls', 'comments'])(
    'fails closed on incomplete bounded %s pagination',
    async (resource) => {
      // arrange
      const fullPage = Array(100).fill(
        resource === 'pulls' ? pullRequest() : { body: 'Earlier comment.' },
      );
      const dependencies = controlled(
        resource === 'pulls' ? { pullPages: () => fullPage } : { commentPages: () => fullPage },
      );

      // act
      const result = rebaseDependabotPullRequests(context, dependencies);

      // assert
      await expect(result).rejects.toThrow('pagination budget');
      expect(writes(dependencies)).toEqual([]);
    },
  );

  it.each(['pulls', 'comments'])('fails closed on malformed %s pagination', async (resource) => {
    // arrange
    const invalidPage = { message: 'synthetic-private-value' };
    const dependencies = controlled(
      resource === 'pulls' ? { pullPages: () => invalidPage } : { commentPages: () => invalidPage },
    );

    // act
    const result = rebaseDependabotPullRequests(context, dependencies);

    // assert
    await expect(result).rejects.toThrow('invalid Dependabot pagination data');
    expect(writes(dependencies)).toEqual([]);
  });

  it.each(['branches/main', 'pulls?', 'pulls/1', 'compare/', 'issues/1/comments'])(
    'stops on an API failure at %s without exposing diagnostics or writing',
    async (failure) => {
      // arrange
      const dependencies = controlled({
        fail: (_method, endpoint) => endpoint.includes(failure),
      });

      // act
      const result = rebaseDependabotPullRequests(context, dependencies);

      // assert
      await expect(result).rejects.toThrow('GitHub API request failed');
      await expect(result).rejects.not.toThrow('synthetic-private-token');
      expect(writes(dependencies)).toEqual([]);
    },
  );

  it('does not retry a command whose API request failed', async () => {
    // arrange
    const dependencies = controlled({ fail: (method) => method === 'POST' });

    // act
    const result = rebaseDependabotPullRequests(context, dependencies);

    // assert
    await expect(result).rejects.toThrow('GitHub API request failed');
    expect(writes(dependencies)).toHaveLength(1);
  });

  it('reports an unconfirmed command without retrying the write', async () => {
    // arrange
    const dependencies = controlled({ posted: { id: 900, body: 'different response' } });

    // act
    const result = rebaseDependabotPullRequests(context, dependencies);

    // assert
    await expect(result).rejects.toThrow('did not confirm');
    expect(writes(dependencies)).toHaveLength(1);
  });
});
