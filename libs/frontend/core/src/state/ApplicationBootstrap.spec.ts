// @vitest-environment jsdom

// #region Imports
import { describe, expect, it } from 'vitest';
import { ApplicationBootstrap } from './ApplicationBootstrap';
// #endregion

function deferred() {
  let finish: () => void = () => {
    throw new Error('Deferred operation was not created.');
  };
  const promise = new Promise<void>((resolve) => {
    finish = resolve;
  });
  return { promise, resolve: () => finish() };
}

describe('ApplicationBootstrap', () => {
  it('shares one promise and finishes shell hydration while remote snapshot and CI usage remain pending', async () => {
    // arrange
    const order: string[] = [];
    const hydration = deferred();
    const snapshot = deferred();
    const usage = deferred();
    const bootstrap = new ApplicationBootstrap(
      {
        refreshConfiguration: () => {
          order.push('configuration');
          return hydration.promise;
        },
        refreshStorageStatus: async (silent) => {
          order.push(`storage:${silent}`);
        },
      },
      {
        refresh: (force) => {
          order.push(`snapshot:${force}`);
          return snapshot.promise;
        },
      },
      {
        initialize: () => {
          order.push('execution');
        },
      },
      {
        refreshSkills: async () => {
          order.push('skills');
        },
      },
      {
        refreshContinuousIntegrationUsage: (ids, silent) => {
          order.push(`usage:${ids}:${silent}`);
          return usage.promise.then(() => true);
        },
        refreshContinuousIntegrationRuns: async () => {
          order.push('runs');
        },
      },
      {
        initializeIncidents: () => {
          order.push('incidents');
        },
      },
    );
    // act
    const initializing = bootstrap.initialize();
    const repeated = bootstrap.initialize();
    hydration.resolve();
    await initializing;
    // assert
    expect(repeated).toBe(initializing);
    expect(order).toEqual([
      'execution',
      'incidents',
      'snapshot:false',
      'configuration',
      'skills',
      'storage:true',
    ]);
    snapshot.resolve();
    await snapshot.promise;
    expect(order.slice(-2)).toEqual(['usage:undefined:true', 'runs']);
    expect(bootstrap.initialize()).toBe(initializing);
    usage.resolve();
  });

  it('starts CI only after hydration even when the initial snapshot has already completed', async () => {
    // arrange
    const hydration = deferred();
    const calls: string[] = [];
    const bootstrap = new ApplicationBootstrap(
      {
        refreshConfiguration: () => hydration.promise,
        refreshStorageStatus: async () => undefined,
      },
      { refresh: async () => undefined },
      null,
      null,
      {
        refreshContinuousIntegrationUsage: async () => {
          calls.push('usage');
          return true;
        },
        refreshContinuousIntegrationRuns: async () => {
          calls.push('runs');
        },
      },
      null,
    );
    // act
    const initialization = bootstrap.initialize();
    await Promise.resolve();
    // assert
    expect(calls).toEqual([]);
    hydration.resolve();
    await initialization;
    expect(calls).toEqual(['usage', 'runs']);
  });

  it('hydrates the kernel with all optional feature participants omitted', async () => {
    // arrange
    const calls: string[] = [];
    const bootstrap = new ApplicationBootstrap(
      {
        refreshConfiguration: async () => {
          calls.push('configuration');
        },
        refreshStorageStatus: async (silent) => {
          calls.push(`storage:${silent}`);
        },
      },
      {
        refresh: async (force) => {
          calls.push(`snapshot:${force}`);
        },
      },
      null,
      null,
      null,
      null,
    );
    // act
    await bootstrap.initialize();
    // assert
    expect(calls).toEqual(['snapshot:false', 'configuration', 'storage:true']);
  });

  it('keeps the same failed initialization promise instead of repeating startup effects', async () => {
    // arrange
    let executions = 0;
    const bootstrap = new ApplicationBootstrap(
      {
        refreshConfiguration: async () => {
          throw new Error('Configuration unavailable');
        },
        refreshStorageStatus: async () => undefined,
      },
      { refresh: async () => undefined },
      {
        initialize: () => {
          executions += 1;
        },
      },
      null,
      null,
      null,
    );
    // act
    const initialization = bootstrap.initialize();
    await expect(initialization).rejects.toThrow('Configuration unavailable');
    // assert
    expect(bootstrap.initialize()).toBe(initialization);
    expect(executions).toBe(1);
  });
});
