// #region Imports

import { describe, expect, it, vi } from 'vitest';
import { requestMergedWorkflow } from './requestMergedWorkflow.mjs';

// #endregion

const sourceSha = 'a'.repeat(40);
const repository = { id: 1440122208, full_name: 'pixel-brewery/symphony' };
const root = 'repos/pixel-brewery/symphony';
const context = {
  eventName: 'workflow_run',
  repository: repository.full_name,
  repositoryId: repository.id,
  sourceSha,
};

function controlled(filename = '.github/workflows/publish-pages.yml') {
  const records = {
    commit: { sha: sourceSha, parents: [{ sha: 'b'.repeat(40) }], files: [{ filename }] },
    main: sourceSha,
    run: undefined as Record<string, unknown> | undefined,
    runs: undefined as unknown,
    moveBeforeDispatch: false,
  };
  let mainReads = 0;
  const request = vi.fn(async (method: string, endpoint: string) => {
    if (method === 'POST') return undefined;
    if (endpoint === `repositories/${repository.id}`)
      return { ...repository, default_branch: 'main', private: false, fork: false };
    if (endpoint === `${root}/branches/main`) {
      mainReads++;
      return {
        name: 'main',
        commit: {
          sha: records.moveBeforeDispatch && mainReads > 1 ? 'c'.repeat(40) : records.main,
        },
      };
    }
    if (endpoint === `${root}/commits/${sourceSha}?per_page=100&page=1`) return records.commit;
    if (endpoint === `${root}/actions/workflows/publish-pages.yml`)
      return {
        id: 700,
        name: 'Publish Symphony Downloads',
        path: '.github/workflows/publish-pages.yml',
        state: 'active',
      };
    if (endpoint === `${root}/actions/workflows/700/runs?head_sha=${sourceSha}&per_page=100`)
      return records.runs === undefined
        ? { total_count: records.run ? 1 : 0, workflow_runs: records.run ? [records.run] : [] }
        : records.runs;
    throw new Error('Unexpected source request.');
  });
  return { records, request };
}

function mainPagesRun(overrides: Record<string, unknown> = {}) {
  return {
    id: 800,
    run_attempt: 1,
    workflow_id: 700,
    head_sha: sourceSha,
    head_branch: 'main',
    path: '.github/workflows/publish-pages.yml',
    event: 'push',
    repository,
    head_repository: repository,
    ...overrides,
  };
}

describe('Source-bound Pages continuation', () => {
  it('continues an Actions dependency update without changing Stable or Canary selection', async () => {
    // arrange
    const boundary = controlled();

    // act
    const result = await requestMergedWorkflow('pages', context, boundary);

    // assert
    expect(result).toEqual({ status: 'requested', sourceSha });
    expect(boundary.request.mock.calls.filter(([method]) => method === 'POST')).toEqual([
      [
        'POST',
        `${root}/actions/workflows/700/dispatches`,
        { ref: 'main', inputs: { expected_head_sha: sourceSha } },
      ],
    ]);
  });

  it('preserves the existing narrow push policy for unrelated dependency files', async () => {
    // arrange
    const boundary = controlled('yarn.lock');

    // act
    const result = await requestMergedWorkflow('pages', context, boundary);

    // assert
    expect(result).toEqual({ status: 'not-required', sourceSha });
    expect(boundary.request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
  });

  it('includes an affected prior filename when a publication source is renamed', async () => {
    // arrange
    const boundary = controlled('resources/download-page/new-hero.webp');
    Object.assign(boundary.records.commit.files[0]!, {
      previous_filename: 'resources/download-page/hero.webp',
    });

    // act
    const result = await requestMergedWorkflow('pages', context, boundary);

    // assert
    expect(result.status).toBe('requested');
  });

  it.each(['tools/BuildDownloadPage.mjs', 'tools/ValidatePagesPublicationWorkflow.mjs'])(
    'retains one-level tooling path matches: %s',
    async (filename) => {
      // arrange
      const boundary = controlled(filename);

      // act
      const result = await requestMergedWorkflow('pages', context, boundary);

      // assert
      expect(result.status).toBe('requested');
    },
  );

  it.each(['tools/nested/BuildDownloadPage.mjs', 'resources/download-page/unrelated.css'])(
    'does not broaden the existing path policy: %s',
    async (filename) => {
      // arrange
      const boundary = controlled(filename);

      // act
      const result = await requestMergedWorkflow('pages', context, boundary);

      // assert
      expect(result.status).toBe('not-required');
    },
  );

  it.each([
    '../publish-pages.yml',
    '/resources/download-page/hero.webp',
    'tools\\Download.mjs',
    'tools/Download\u0000.mjs',
    'tools/Download\n.mjs',
  ])('rejects malformed source metadata before dispatch: %s', async (filename) => {
    // arrange
    const boundary = controlled(filename);

    // act
    const result = requestMergedWorkflow('pages', context, boundary);

    // assert
    await expect(result).rejects.toThrow('Pages request failed');
    expect(boundary.request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
  });

  it('fails closed for a potentially truncated commit file inventory', async () => {
    // arrange
    const boundary = controlled();
    boundary.records.commit.files = Array.from({ length: 100 }, (_, index) => ({
      filename: `files/${index}`,
    }));

    // act
    const result = requestMergedWorkflow('pages', context, boundary);

    // assert
    await expect(result).rejects.toThrow('Pages request failed');
    expect(boundary.request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
  });

  it('does not dispatch after main moves during source inspection', async () => {
    // arrange
    const boundary = controlled();
    boundary.records.moveBeforeDispatch = true;

    // act
    const result = await requestMergedWorkflow('pages', context, boundary);

    // assert
    expect(result.status).toBe('superseded');
    expect(boundary.request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
  });

  it('retains a failed original attempt rather than creating a second deployment', async () => {
    // arrange
    const boundary = controlled();
    boundary.records.run = {
      id: 800,
      run_attempt: 1,
      workflow_id: 700,
      head_sha: sourceSha,
      head_branch: 'main',
      path: '.github/workflows/publish-pages.yml',
      event: 'workflow_dispatch',
      repository,
      head_repository: repository,
      status: 'completed',
      conclusion: 'failure',
    };

    // act
    const result = await requestMergedWorkflow('pages', context, boundary);

    // assert
    expect(result).toEqual({ status: 'already-requested', sourceSha, runId: 800 });
    expect(boundary.request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
  });

  it.each(['schedule', 'workflow_dispatch'])(
    'recovers the exact authorized source from %s without changing Pages policy',
    async (eventName) => {
      // arrange
      const boundary = controlled();

      // act
      const result = await requestMergedWorkflow('pages', { ...context, eventName }, boundary);

      // assert
      expect(result).toEqual({ status: 'requested', sourceSha });
    },
  );

  it.each(['push', 'workflow_dispatch'])(
    'retains an exact main %s run regardless of its outcome',
    async (event) => {
      // arrange
      const boundary = controlled();
      boundary.records.run = {
        id: 800,
        run_attempt: 1,
        workflow_id: 700,
        head_sha: sourceSha,
        head_branch: 'main',
        path: '.github/workflows/publish-pages.yml@refs/heads/main',
        event,
        repository,
        head_repository: repository,
        status: 'completed',
        conclusion: 'cancelled',
      };

      // act
      const result = await requestMergedWorkflow('pages', context, boundary);

      // assert
      expect(result).toEqual({ status: 'already-requested', sourceSha, runId: 800 });
      expect(boundary.request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
    },
  );

  it.each(['refs/heads/other', 'refs/pull/7/merge', 'main', ''])(
    'ignores a foreign workflow suffix before requesting the exact main source: %s',
    async (suffix) => {
      // arrange
      const boundary = controlled();
      boundary.records.run = {
        id: 800,
        run_attempt: 1,
        workflow_id: 700,
        head_sha: sourceSha,
        head_branch: 'main',
        path: `.github/workflows/publish-pages.yml@${suffix}`,
        event: 'push',
        repository,
        head_repository: repository,
      };

      // act
      const result = await requestMergedWorkflow('pages', context, boundary);

      // assert
      expect(result).toEqual({ status: 'requested', sourceSha });
      expect(boundary.request.mock.calls.filter(([method]) => method === 'POST')).toEqual([
        [
          'POST',
          `${root}/actions/workflows/700/dispatches`,
          { ref: 'main', inputs: { expected_head_sha: sourceSha } },
        ],
      ]);
    },
  );

  it.each(
    (['verification', 'release', 'pages'] as const).flatMap((kind) =>
      (['push', 'workflow_dispatch'] as const).map((event) => ({ kind, event })),
    ),
  )(
    'deduplicates exact main $event evidence for the fixed $kind profile',
    async ({ kind, event }) => {
      // arrange
      const boundary = controlled();
      const profile = {
        verification: { name: 'Repository Quality', file: 'ci.yml' },
        release: { name: 'Continuous Desktop Release', file: 'release.yml' },
        pages: { name: 'Publish Symphony Downloads', file: 'publish-pages.yml' },
      }[kind];
      const request = vi.fn(async (method: string, endpoint: string) => {
        if (endpoint === `${root}/actions/workflows/${profile.file}`)
          return {
            id: 700,
            name: profile.name,
            path: `.github/workflows/${profile.file}`,
            state: 'active',
          };
        if (endpoint === `${root}/actions/workflows/700/runs?head_sha=${sourceSha}&per_page=100`)
          return {
            total_count: 1,
            workflow_runs: [
              {
                id: 800,
                run_attempt: 1,
                workflow_id: 700,
                head_sha: sourceSha,
                head_branch: 'main',
                path: `.github/workflows/${profile.file}`,
                event,
                repository,
                head_repository: repository,
                status: 'completed',
                conclusion: 'failure',
              },
            ],
          };
        return boundary.request(method, endpoint);
      });

      // act
      const result = await requestMergedWorkflow(kind, context, { request });

      // assert
      expect(result).toEqual({ status: 'already-requested', sourceSha, runId: 800 });
      expect(request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
    },
  );

  it.each(['queued', 'failure', 'cancelled'])(
    'retains the exact main push in a mixed inventory when its outcome is %s',
    async (outcome) => {
      // arrange
      const boundary = controlled();
      const main = mainPagesRun({
        status: outcome === 'queued' ? 'queued' : 'completed',
        conclusion: outcome === 'queued' ? null : outcome,
      });
      boundary.records.runs = {
        total_count: 3,
        workflow_runs: [
          mainPagesRun({ id: 798, head_branch: 'feature/diagnostic', event: 'workflow_dispatch' }),
          mainPagesRun({ id: 799, event: 'pull_request' }),
          main,
        ],
      };

      // act
      const result = await requestMergedWorkflow('pages', context, boundary);

      // assert
      expect(result).toEqual({ status: 'already-requested', sourceSha, runId: main.id });
      expect(boundary.request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
    },
  );

  it.each([
    { event: 'workflow_dispatch', head_branch: 'feature/diagnostic' },
    { event: 'pull_request', head_branch: 'main' },
  ])('does not let a valid unrelated run block the bound main dispatch: %j', async (override) => {
    // arrange
    const boundary = controlled();
    boundary.records.run = mainPagesRun(override);

    // act
    const result = await requestMergedWorkflow('pages', context, boundary);

    // assert
    expect(result).toEqual({ status: 'requested', sourceSha });
    expect(boundary.request.mock.calls.filter(([method]) => method === 'POST')).toEqual([
      [
        'POST',
        `${root}/actions/workflows/700/dispatches`,
        { ref: 'main', inputs: { expected_head_sha: sourceSha } },
      ],
    ]);
  });

  it.each([
    { total_count: -1, workflow_runs: [] },
    { total_count: 0, workflow_runs: null },
    { total_count: 1, workflow_runs: [] },
    {
      total_count: 101,
      workflow_runs: Array.from({ length: 101 }, (_, id) => mainPagesRun({ id: id + 1 })),
    },
  ])('fails closed before dispatch for a malformed or incomplete inventory: %j', async (runs) => {
    // arrange
    const boundary = controlled();
    boundary.records.runs = runs;

    // act
    const result = requestMergedWorkflow('pages', context, boundary);

    // assert
    await expect(result).rejects.toThrow('Pages request failed');
    expect(boundary.request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
  });

  it.each([
    { id: undefined },
    { id: 0 },
    { id: -1 },
    { run_attempt: undefined },
    { run_attempt: 0 },
    { run_attempt: -1 },
  ])(
    'rejects malformed unrelated run metadata even beside a canonical run: %j',
    async (override) => {
      // arrange
      const boundary = controlled();
      boundary.records.runs = {
        total_count: 2,
        workflow_runs: [
          mainPagesRun({ id: 799, event: 'pull_request', ...override }),
          mainPagesRun(),
        ],
      };

      // act
      const result = requestMergedWorkflow('pages', context, boundary);

      // assert
      await expect(result).rejects.toThrow('Pages request failed');
      expect(boundary.request.mock.calls.some(([method]) => method === 'POST')).toBe(false);
    },
  );
});
