// @vitest-environment jsdom

// #region Imports

import { DOCUMENT } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { ClipboardService } from './ClipboardService';

// #endregion

function serviceWith(clipboard: unknown): ClipboardService {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({
    providers: [{ provide: DOCUMENT, useValue: { defaultView: { navigator: { clipboard } } } }],
  });
  return TestBed.inject(ClipboardService);
}

describe('ClipboardService', () => {
  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  afterAll(() => TestBed.resetTestEnvironment());

  it('reports a written value so the caller can confirm it to the user', async () => {
    // arrange
    const writeText = vi.fn().mockResolvedValue(undefined);
    // act
    const service = serviceWith({ writeText });

    // assert
    await expect(service.writeText('https://github.com/example/platform/issues/7')).resolves.toBe(
      true,
    );
    expect(writeText).toHaveBeenCalledWith('https://github.com/example/platform/issues/7');
  });

  it('reports failure instead of claiming a copy that never happened', async () => {
    // act
    // arrange
    const denied = serviceWith({ writeText: vi.fn().mockRejectedValue(new Error('denied')) });
    // assert
    await expect(denied.writeText('https://github.com/example/platform/issues/7')).resolves.toBe(
      false,
    );

    const unavailable = serviceWith(undefined);
    await expect(
      unavailable.writeText('https://github.com/example/platform/issues/7'),
    ).resolves.toBe(false);
  });

  it('copies nothing when there is no value', async () => {
    // arrange
    const writeText = vi.fn();
    // act
    const service = serviceWith({ writeText });

    // assert
    await expect(service.writeText(undefined)).resolves.toBe(false);
    expect(writeText).not.toHaveBeenCalled();
  });
});
