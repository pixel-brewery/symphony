// #region Imports

import type { PowerState } from '@symphony/ipc-contracts-desktop';
import { describe, expect, it } from 'vitest';
import { KeepAwakeCoordinator, type IPowerSaveBlocker } from './';

// #endregion

class FakePowerSaveBlocker implements IPowerSaveBlocker {
  // #region Fields

  public readonly started: ('prevent-app-suspension' | 'prevent-display-sleep')[] = [];
  public readonly stopped: number[] = [];
  private readonly _active = new Set<number>();
  private _nextId = 1;

  // #endregion

  // #region Methods

  public start(type: 'prevent-app-suspension' | 'prevent-display-sleep'): number {
    const id = this._nextId++;
    this.started.push(type);
    this._active.add(id);
    return id;
  }

  public stop(id: number): void {
    this.stopped.push(id);
    this._active.delete(id);
  }

  public isStarted(id: number): boolean {
    return this._active.has(id);
  }

  // #endregion
}

function createCoordinator(
  blocker: FakePowerSaveBlocker,
  enabled: boolean,
  persisted: boolean[] = [],
): KeepAwakeCoordinator {
  return new KeepAwakeCoordinator({
    blocker,
    enabled,
    persist: (value) => persisted.push(value),
  });
}

describe('KeepAwakeCoordinator', () => {
  it('leaves the machine sleepable while the setting is off', () => {
    // arrange
    const blocker = new FakePowerSaveBlocker();
    const coordinator = createCoordinator(blocker, false);

    // act
    const state = coordinator.reportActiveTasks(3);

    // assert
    expect(state.engaged).toBe(false);
    expect(blocker.started).toEqual([]);
  });

  it('blocks system sleep, not the display, once a task runs', () => {
    // arrange
    const blocker = new FakePowerSaveBlocker();
    const coordinator = createCoordinator(blocker, true);

    // act
    const state = coordinator.reportActiveTasks(1);

    // assert
    expect(state).toEqual({ keepAwakeWhileBusy: true, engaged: true, activeTaskCount: 1 });
    expect(blocker.started).toEqual(['prevent-app-suspension']);
  });

  it('holds a single assertion across task-count changes', () => {
    // arrange
    const blocker = new FakePowerSaveBlocker();
    const coordinator = createCoordinator(blocker, true);
    coordinator.reportActiveTasks(1);

    // act
    coordinator.reportActiveTasks(4);

    // assert
    expect(blocker.started).toEqual(['prevent-app-suspension']);
    expect(blocker.stopped).toEqual([]);
  });

  it('releases the assertion when the last task finishes', () => {
    // arrange
    const blocker = new FakePowerSaveBlocker();
    const coordinator = createCoordinator(blocker, true);
    coordinator.reportActiveTasks(2);

    // act
    const state = coordinator.reportActiveTasks(0);

    // assert
    expect(state.engaged).toBe(false);
    expect(blocker.stopped).toHaveLength(1);
  });

  it('releases the assertion when the setting is switched off mid-run', () => {
    // arrange
    const blocker = new FakePowerSaveBlocker();
    const persisted: boolean[] = [];
    const coordinator = createCoordinator(blocker, true, persisted);
    coordinator.reportActiveTasks(2);

    // act
    const state = coordinator.setEnabled(false);

    // assert
    expect(state).toEqual({ keepAwakeWhileBusy: false, engaged: false, activeTaskCount: 2 });
    expect(persisted).toEqual([false]);
    expect(blocker.stopped).toHaveLength(1);
  });

  it('publishes every state change to subscribers', () => {
    // arrange
    const blocker = new FakePowerSaveBlocker();
    const coordinator = createCoordinator(blocker, true);
    const states: PowerState[] = [];
    coordinator.subscribe((state) => states.push(state));

    // act
    coordinator.reportActiveTasks(1);

    // assert
    expect(states).toEqual([{ keepAwakeWhileBusy: true, engaged: true, activeTaskCount: 1 }]);
  });

  it('stays silent when a report repeats the current state', () => {
    // arrange
    const blocker = new FakePowerSaveBlocker();
    const coordinator = createCoordinator(blocker, true);
    coordinator.reportActiveTasks(1);
    const states: PowerState[] = [];
    coordinator.subscribe((state) => states.push(state));

    // act
    coordinator.reportActiveTasks(1);

    // assert
    expect(states).toEqual([]);
  });

  it('releases the assertion on disposal', () => {
    // arrange
    const blocker = new FakePowerSaveBlocker();
    const coordinator = createCoordinator(blocker, true);
    coordinator.reportActiveTasks(1);

    // act
    coordinator.dispose();

    // assert
    expect(blocker.stopped).toHaveLength(1);
  });
});
