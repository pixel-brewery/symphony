// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { BROWSER_STORAGE } from '../storage/BrowserStorageToken';
import { PaneSizeMemory } from './PaneSizeMemory';

// #endregion

function createStorage(entries: Record<string, string> = {}): Storage {
  const values = new Map(Object.entries(entries));
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => void values.set(key, value),
  };
}

function createMemory(storage: Storage | undefined): PaneSizeMemory {
  TestBed.configureTestingModule({ providers: [{ provide: BROWSER_STORAGE, useValue: storage }] });
  return TestBed.inject(PaneSizeMemory);
}

describe('PaneSizeMemory', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('knows no size until the user resized the pane', () => {
    // arrange
    const memory = createMemory(createStorage());

    // act
    const size = memory.read('inbox.list');

    // assert
    expect(size).toBeUndefined();
  });

  it('remembers the dragged size per pane in whole pixels', () => {
    // arrange
    const storage = createStorage();
    const memory = createMemory(storage);

    // act
    memory.remember('inbox.list', 356.6);
    memory.remember('orbit.inspector', 300);

    // assert
    expect(memory.read('inbox.list')).toBe(357);
    expect(memory.read('orbit.inspector')).toBe(300);
    expect(storage.getItem('symphony.pane.inbox.list')).toBe('357');
  });

  it('ignores sizes that are not a positive number of pixels', () => {
    // arrange
    const storage = createStorage({ 'symphony.pane.inbox.list': 'wide' });
    const memory = createMemory(storage);

    // act
    memory.remember('orbit.inspector', 0);
    memory.remember('actions.workflows', Number.NaN);

    // assert
    expect(memory.read('inbox.list')).toBeUndefined();
    expect(storage.length).toBe(1);
  });

  it('opens panes at their default size when the storage is unavailable', () => {
    // arrange
    const blocked = createStorage();
    blocked.getItem = () => {
      throw new Error('blocked');
    };
    blocked.setItem = () => {
      throw new Error('full');
    };
    const memory = createMemory(blocked);

    // act
    const remember = (): void => memory.remember('inbox.list', 320);
    const size = memory.read('inbox.list');

    // assert
    expect(remember).not.toThrow();
    expect(size).toBeUndefined();
  });

  it('opens panes at their default size outside a browser', () => {
    // arrange
    const memory = createMemory(undefined);

    // act
    memory.remember('inbox.list', 320);
    const size = memory.read('inbox.list');

    // assert
    expect(size).toBeUndefined();
  });
});
