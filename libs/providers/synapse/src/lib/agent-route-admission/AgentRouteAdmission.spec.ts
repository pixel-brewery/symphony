// #region Imports

import { describe, expect, it, vi } from 'vitest';
import type { IAgentRouteDescriptor } from '../agent-route-governor/IAgentRouteDescriptor';
import { AgentRouteAdmission } from './AgentRouteAdmission';

// #endregion

describe('AgentRouteAdmission', () => {
  it('bounds concurrent work across every candidate in one workspace route policy', async () => {
    // arrange
    const admission = new AgentRouteAdmission();
    const route = target('workspace-a', 'route-a', 2);
    const releases: Array<() => void> = [];
    let active = 0;
    let maximumActive = 0;
    const execute = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          active += 1;
          maximumActive = Math.max(maximumActive, active);
          releases.push(() => {
            active -= 1;
            resolve('completed');
          });
        }),
    );

    // act
    const operations = [
      admission.run(route, new AbortController().signal, execute),
      admission.run(route, new AbortController().signal, execute),
      admission.run(route, new AbortController().signal, execute),
    ];

    // assert
    expect(execute).toHaveBeenCalledTimes(2);
    expect(admission.snapshot(route)).toEqual({ active: 2, queued: 1, maximum: 2 });
    releases.shift()?.();
    await vi.waitFor(() => expect(execute).toHaveBeenCalledTimes(3));
    while (releases.length) releases.shift()?.();
    await expect(Promise.all(operations)).resolves.toEqual(['completed', 'completed', 'completed']);
    expect(maximumActive).toBe(2);
    expect(admission.snapshot(route)).toEqual({ active: 0, queued: 0, maximum: 2 });
  });

  it('does not let one workspace or route policy consume another policy capacity', async () => {
    // arrange
    const admission = new AgentRouteAdmission();
    const releases: Array<() => void> = [];
    const execute = () => new Promise<void>((resolve) => releases.push(resolve));

    const first = admission.run(
      target('workspace:a', 'route', 1),
      new AbortController().signal,
      execute,
    );
    // act
    const second = admission.run(
      target('workspace', 'a:route', 1),
      new AbortController().signal,
      execute,
    );

    // assert
    expect(releases).toHaveLength(2);
    while (releases.length) releases.shift()?.();
    await expect(Promise.all([first, second])).resolves.toEqual([undefined, undefined]);
  });

  it('removes cancelled queued work without consuming or leaking a slot', async () => {
    // arrange
    const admission = new AgentRouteAdmission();
    const route = target('workspace-a', 'route', 1);
    let releaseActive: (() => void) | undefined;
    const active = admission.run(
      route,
      new AbortController().signal,
      () => new Promise<void>((resolve) => (releaseActive = resolve)),
    );
    const queuedController = new AbortController();
    const queuedExecute = vi.fn(async () => undefined);
    const queued = admission.run(route, queuedController.signal, queuedExecute);

    // act
    const actual = admission.snapshot(route);

    // assert
    expect(actual).toEqual({ active: 1, queued: 1, maximum: 1 });
    queuedController.abort(new Error('Operator cancelled queued work.'));
    await expect(queued).rejects.toThrow('Operator cancelled queued work.');
    expect(queuedExecute).not.toHaveBeenCalled();
    expect(admission.snapshot(route)).toEqual({ active: 1, queued: 0, maximum: 1 });

    releaseActive?.();
    await active;
    await expect(
      admission.run(route, new AbortController().signal, async () => 'next'),
    ).resolves.toBe('next');
  });
});

function target(
  workspaceId: string,
  routePolicyId: string,
  maxParallelExecutions: number,
): IAgentRouteDescriptor {
  return {
    routing: {
      workspaceId,
      agentProfileId: 'agent',
      routePolicyId,
      routeCandidateId: 'candidate',
      strategy: 'priority',
      costClass: 'subscription-included',
      priority: 1,
      sessionAffinity: true,
      maxParallelExecutions,
    },
  };
}
