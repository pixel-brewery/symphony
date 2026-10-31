// @vitest-environment jsdom

// #region Imports

import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { DialogService } from '@pixel-brewery/mosaik-elements-angular';
import { Subject } from 'rxjs';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { NewWorkItemSheet } from './NewWorkItemSheet';

// #endregion

describe('NewWorkItemSheet', () => {
  beforeAll(() => TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting()));
  beforeEach(() => TestBed.resetTestingModule());
  afterAll(() => TestBed.resetTestEnvironment());

  it('keeps one sheet open, draws attention to it and opens a new one once it closed', () => {
    // arrange
    const closed = new Subject<unknown>();
    const ref = {
      closed,
      requestAttention: vi.fn(async () => true),
      element: document.createElement('div'),
    };
    const show = vi.fn(() => ref);
    TestBed.configureTestingModule({
      providers: [{ provide: DialogService, useValue: { show } }],
    });
    const sheet = TestBed.inject(NewWorkItemSheet);

    // act
    const first = sheet.open({ columnId: 'ready', stageId: 'ready' });
    const second = sheet.open();
    closed.next({});
    sheet.open();

    // assert
    expect(first).toBe(second);
    expect(ref.requestAttention).toHaveBeenCalledOnce();
    expect(show).toHaveBeenCalledTimes(2);
    expect(show).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        data: { columnId: 'ready', stageId: 'ready' },
        pressEscapeToClose: true,
        clickOutsideToClose: false,
      }),
    );
  });

  it('caps the dialog surface itself at the sheet height so its footer stays in the window', () => {
    // arrange
    const element = document.createElement('div');
    const show = vi.fn(() => ({ closed: new Subject<unknown>(), element }));
    TestBed.configureTestingModule({
      providers: [{ provide: DialogService, useValue: { show } }],
    });
    const sheet = TestBed.inject(NewWorkItemSheet);

    // act
    sheet.open();

    // assert
    expect(show).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ maxSize: { width: '100vw', height: '86dvh' } }),
    );
    expect(element.style.getPropertyValue('--dialog-max-height')).toBe('86dvh');
  });
});
