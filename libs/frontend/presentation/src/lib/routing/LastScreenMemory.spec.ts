// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { BROWSER_STORAGE } from '@symphony/frontend-core';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { LastScreenMemory } from './LastScreenMemory';

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

function createMemory(storage: Storage | undefined): LastScreenMemory {
  TestBed.configureTestingModule({ providers: [{ provide: BROWSER_STORAGE, useValue: storage }] });
  return TestBed.inject(LastScreenMemory);
}

describe('LastScreenMemory', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  afterEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('knows no screen before the first visit', () => {
    // arrange
    const memory = createMemory(createStorage());

    // act
    const screen = memory.read();

    // assert
    expect(screen).toBeUndefined();
  });

  it('remembers the screen without the transient query of the visit', () => {
    // arrange
    const memory = createMemory(createStorage());

    // act
    memory.remember('/main/inbox');
    memory.remember('/main/board?create=true');

    // assert
    expect(memory.read()).toBe('/main/board');
  });

  it('keeps the screen before Settings while Settings is open', () => {
    // arrange
    const memory = createMemory(createStorage());

    // act
    memory.remember('/main/board/work-item-1');
    memory.remember('/main/settings?workspace=personal&section=team');
    memory.remember('/main/settings');
    memory.remember('/main/projects');

    // assert
    expect(memory.read()).toBe('/main/board/work-item-1');
  });

  it('ignores windows and paths that are not a screen of the main window', () => {
    // arrange
    const storage = createStorage({ 'symphony.window.last-screen': 'https://example.com/main/x' });
    const memory = createMemory(storage);

    // act
    memory.remember('/menu-bar');
    memory.remember('/main');
    memory.remember('/main/../settings');
    const stored = memory.read();

    // assert
    expect(stored).toBeUndefined();
    expect(storage.getItem('symphony.window.last-screen')).toBe('https://example.com/main/x');
  });

  it('opens the start page when the storage is unavailable', () => {
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
    const remember = (): void => memory.remember('/main/inbox');

    // assert
    expect(remember).not.toThrow();
    expect(memory.read()).toBeUndefined();
  });
});
