// #region Imports
import { afterEach, describe, expect, it, vi } from 'vitest';
import { runDependabotAutomation } from './runDependabotAutomation.mjs';
// #endregion

const boundaries = vi.hoisted(() => ({
  reconcile: vi.fn(),
  authorize: vi.fn(),
  current: vi.fn(),
  workflow: vi.fn(),
  release: vi.fn(),
  append: vi.fn(),
}));
vi.mock('node:fs', () => ({ appendFileSync: boundaries.append }));
vi.mock('./reconcileDependabotBranches.mjs', () => ({
  reconcileDependabotBranches: boundaries.reconcile,
}));
vi.mock('./github/authorizePullRequestWorkflows.mjs', () => ({
  authorizePullRequestWorkflows: boundaries.authorize,
}));
vi.mock('./github/readCurrentMergedDependabot.mjs', () => ({
  readCurrentMergedDependabot: boundaries.current,
}));
vi.mock('./requestMergedVerification.mjs', () => ({
  requestMergedVerification: boundaries.workflow,
}));
vi.mock('./requestMergedPages.mjs', () => ({ requestMergedPages: boundaries.workflow }));
vi.mock('./requestMergedRelease.mjs', () => ({ requestMergedRelease: boundaries.release }));
const source = 'a'.repeat(40),
  next = 'b'.repeat(40);

function environment(event = 'schedule') {
  vi.stubEnv('GITHUB_EVENT_NAME', event);
  vi.stubEnv('GITHUB_REF', 'refs/heads/main');
  vi.stubEnv('GITHUB_REPOSITORY', 'pixel-brewery/symphony');
  vi.stubEnv('GITHUB_REPOSITORY_ID', '1440122208');
  vi.stubEnv('DEFAULT_BRANCH', 'main');
  vi.stubEnv('GITHUB_OUTPUT', 'controlled-output');
  vi.stubEnv('MERGE_COMMIT_SHA', '');
  vi.stubEnv('RECONCILE_MERGE_SHA', '');
  vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
  boundaries.workflow.mockResolvedValue({ status: 'requested' });
  boundaries.release.mockResolvedValue({ status: 'requested' });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  Object.values(boundaries).forEach((value) => value.mockReset());
});

describe('Trusted dependency workflow entry', () => {
  it('routes isolated authorization without invoking branch, merge recovery or release owners', async () => {
    // arrange
    environment();
    boundaries.authorize.mockResolvedValue([{ number: 7, status: 'verification-approved' }]);

    // act
    const result = await runDependabotAutomation('authorize');

    // assert
    expect(result.status).toBe('authorized');
    expect(boundaries.authorize).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ eventName: 'schedule', repositoryId: '1440122208' }),
    );
    expect(boundaries.reconcile).not.toHaveBeenCalled();
    expect(boundaries.current).not.toHaveBeenCalled();
    expect(boundaries.release).not.toHaveBeenCalled();
    expect(boundaries.workflow).not.toHaveBeenCalled();
    expect(boundaries.append).not.toHaveBeenCalled();
  });

  it('reports a blocked approval without attempting another privileged operation', async () => {
    // arrange
    environment();
    boundaries.authorize.mockResolvedValue([{ number: 7, status: 'blocked' }]);

    // act
    const result = runDependabotAutomation('authorize');

    // assert
    await expect(result).rejects.toThrow('authorization stopped');
    expect(boundaries.authorize).toHaveBeenCalledTimes(1);
    expect(boundaries.reconcile).not.toHaveBeenCalled();
    expect(boundaries.release).not.toHaveBeenCalled();
  });

  it('exports a scheduled actual merge to the separate continuation job', async () => {
    // arrange
    environment();
    boundaries.reconcile.mockResolvedValue([{ number: 7, status: 'merged', sha: source }]);
    // act
    await runDependabotAutomation('reconcile');
    // assert
    expect(boundaries.append).toHaveBeenCalledExactlyOnceWith(
      'controlled-output',
      `merge_sha=${source}\n`,
      'utf8',
    );
    expect(boundaries.release).not.toHaveBeenCalled();
  });

  it('recovers a confirmed current closed merge without claiming another merge', async () => {
    // arrange
    environment();
    boundaries.reconcile.mockResolvedValue([]);
    boundaries.current.mockResolvedValue({ number: 7, sha: source });
    // act
    const result = await runDependabotAutomation('reconcile');
    // assert
    expect(result.results).toEqual([{ status: 'continuation-pending', number: 7, sha: source }]);
    expect(boundaries.append).toHaveBeenCalledExactlyOnceWith(
      'controlled-output',
      `merge_sha=${source}\n`,
      'utf8',
    );
  });

  it.each(['schedule', 'workflow_dispatch', 'workflow_run'])(
    'continues a retained source for trusted %s',
    async (event) => {
      // arrange
      environment(event);
      vi.stubEnv('RECONCILE_MERGE_SHA', source);
      boundaries.current.mockResolvedValue({ number: 7, sha: source });
      // act
      await runDependabotAutomation('continue');
      // assert
      expect(boundaries.release).toHaveBeenCalledExactlyOnceWith(
        expect.objectContaining({ eventName: event, sourceSha: source }),
      );
      expect(boundaries.workflow).toHaveBeenCalledTimes(2);
    },
  );

  it('selects the current independently confirmed source from two actual merge outputs', async () => {
    // arrange
    environment();
    vi.stubEnv('MERGE_COMMIT_SHA', source);
    vi.stubEnv('RECONCILE_MERGE_SHA', next);
    boundaries.current.mockResolvedValue({ number: 8, sha: next });
    // act
    await runDependabotAutomation('continue');
    // assert
    expect(boundaries.release).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({ sourceSha: next }),
    );
  });

  it('does not replace a superseded requested source with an unrelated current source', async () => {
    // arrange
    environment();
    vi.stubEnv('MERGE_COMMIT_SHA', source);
    boundaries.current.mockResolvedValue({ number: 8, sha: next });
    // act
    const result = await runDependabotAutomation('continue');
    // assert
    expect(result).toEqual({ status: 'superseded', sourceSha: source });
    expect(boundaries.release).not.toHaveBeenCalled();
    expect(boundaries.workflow).not.toHaveBeenCalled();
  });

  it('dispatches nothing without a separately confirmed full merged pull request', async () => {
    // arrange
    environment();
    vi.stubEnv('MERGE_COMMIT_SHA', source);
    boundaries.current.mockResolvedValue(undefined);
    // act
    const result = await runDependabotAutomation('continue');
    // assert
    expect(result).toEqual({ status: 'skipped', reason: 'unconfirmed-merged-source' });
    expect(boundaries.release).not.toHaveBeenCalled();
    expect(boundaries.workflow).not.toHaveBeenCalled();
  });

  it('rejects a branch workflow before any privileged owner runs', async () => {
    // arrange
    environment();
    vi.stubEnv('GITHUB_REF', 'refs/heads/untrusted');
    // act
    const result = runDependabotAutomation('reconcile');
    // assert
    await expect(result).rejects.toThrow('default branch');
    expect(boundaries.reconcile).not.toHaveBeenCalled();
  });

  it('rejects a continuation without any confirmed source', async () => {
    // arrange
    environment();
    // act
    const result = runDependabotAutomation('continue');
    // assert
    await expect(result).rejects.toThrow('confirmed merge source');
    expect(boundaries.release).not.toHaveBeenCalled();
  });
});
